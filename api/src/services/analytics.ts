/**
 * First-party traffic analytics (PRD — admin/ops).
 *
 * Pageviews are appended one-per-line to data/analytics/<YYYY-MM-DD>.jsonl.
 * Append-only JSONL is deliberate: the jsonStore Collection rewrites the whole
 * file on every save, which does not scale to pageview volume. This mirrors the
 * Phase 0 ingestion JSONL idiom (ingestion/src/publishers/jsonlPublisher.ts) —
 * cheap appends now, swappable for a real analytics sink later.
 *
 * Summaries are computed by reading the recent day-files and aggregating in
 * memory, with a short cache so admin polling stays cheap.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type PageContextType = "city" | "team" | "venue" | "home" | "other";

export interface PageContext {
  type: PageContextType;
  city?: string;
  team?: string;
  venueId?: string;
}

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
}

/** A recorded pageview. Intentionally PII-light — no raw IP, no user id. */
export interface PageView {
  id: string;
  ts: string;
  path: string;
  sessionId: string;
  referrerHost?: string;
  context?: PageContext;
  utm?: Utm;
}

export interface PageViewInput {
  path: string;
  sessionId: string;
  referrerHost?: string;
  context?: PageContext;
  utm?: Utm;
}

export interface CountEntry {
  key: string;
  count: number;
}

export interface DailyPoint {
  date: string;
  views: number;
  sessions: number;
}

export interface AnalyticsSummary {
  rangeDays: number;
  generatedAt: string;
  totalViews: number;
  uniqueSessions: number;
  topPaths: CountEntry[];
  topCities: CountEntry[];
  topTeams: CountEntry[];
  topVenues: CountEntry[];
  topReferrers: CountEntry[];
  topSources: CountEntry[];
  daily: DailyPoint[];
}

const CONTEXT_TYPES: readonly PageContextType[] = [
  "city",
  "team",
  "venue",
  "home",
  "other",
];
const MAX_STR = 256;
const TOP_N = 10;
const SUMMARY_TTL_MS = 60_000;

const clip = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, MAX_STR) : undefined;
};

/** UTC date key (YYYY-MM-DD) for a Date. */
const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

export class AnalyticsService {
  private readonly dir: string;
  private writeChain: Promise<void> = Promise.resolve();
  private cache = new Map<number, { at: number; summary: AnalyticsSummary }>();

  constructor(dataDir: string) {
    this.dir = resolve(dataDir, "analytics");
  }

  private fileFor(date: string): string {
    return resolve(this.dir, `${date}.jsonl`);
  }

  /** Append a sanitized pageview to today's JSONL file. */
  async record(input: PageViewInput): Promise<void> {
    const path = clip(input.path);
    const sessionId = clip(input.sessionId);
    if (!path || !sessionId) return; // nothing useful to record

    const view: PageView = {
      id: randomUUID(),
      ts: new Date().toISOString(),
      path,
      sessionId,
      referrerHost: clip(input.referrerHost),
      context: this.sanitizeContext(input.context),
      utm: this.sanitizeUtm(input.utm),
    };

    const line = JSON.stringify(view) + "\n";
    const file = this.fileFor(dateKey(new Date()));
    // Serialize appends so concurrent records don't interleave bytes.
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(this.dir, { recursive: true });
      await appendFile(file, line, "utf8");
    });
    this.cache.clear();
    return this.writeChain;
  }

  private sanitizeContext(ctx: PageContext | undefined): PageContext | undefined {
    if (!ctx || typeof ctx !== "object") return undefined;
    const type = CONTEXT_TYPES.includes(ctx.type) ? ctx.type : "other";
    const out: PageContext = { type };
    const city = clip(ctx.city);
    const team = clip(ctx.team);
    const venueId = clip(ctx.venueId);
    if (city) out.city = city;
    if (team) out.team = team;
    if (venueId) out.venueId = venueId;
    return out;
  }

  private sanitizeUtm(utm: Utm | undefined): Utm | undefined {
    if (!utm || typeof utm !== "object") return undefined;
    const source = clip(utm.source);
    const medium = clip(utm.medium);
    const campaign = clip(utm.campaign);
    if (!source && !medium && !campaign) return undefined;
    return { source, medium, campaign };
  }

  /** Read one day's pageviews; missing file → []. */
  private async readDay(date: string): Promise<PageView[]> {
    try {
      const text = await readFile(this.fileFor(date), "utf8");
      return text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l) as PageView);
    } catch {
      return [];
    }
  }

  /** Aggregate the last `rangeDays` days (inclusive of today). Cached ~60s. */
  async summary(rangeDays: number): Promise<AnalyticsSummary> {
    const days = Math.max(1, Math.min(rangeDays, 90));
    const cached = this.cache.get(days);
    if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.summary;

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(dateKey(d));
    }

    const paths = new Map<string, number>();
    const cities = new Map<string, number>();
    const teams = new Map<string, number>();
    const venues = new Map<string, number>();
    const referrers = new Map<string, number>();
    const sources = new Map<string, number>();
    const sessions = new Set<string>();
    const daily: DailyPoint[] = [];
    let totalViews = 0;

    for (const date of dates) {
      const views = await this.readDay(date);
      const daySessions = new Set<string>();
      for (const v of views) {
        totalViews++;
        sessions.add(v.sessionId);
        daySessions.add(v.sessionId);
        bump(paths, v.path);
        if (v.referrerHost) bump(referrers, v.referrerHost);
        if (v.utm?.source) bump(sources, v.utm.source);
        const ctx = v.context;
        if (ctx?.city) bump(cities, ctx.city);
        if (ctx?.team) bump(teams, ctx.team);
        if (ctx?.venueId) bump(venues, ctx.venueId);
      }
      daily.push({ date, views: views.length, sessions: daySessions.size });
    }

    const summary: AnalyticsSummary = {
      rangeDays: days,
      generatedAt: new Date().toISOString(),
      totalViews,
      uniqueSessions: sessions.size,
      topPaths: topN(paths),
      topCities: topN(cities),
      topTeams: topN(teams),
      topVenues: topN(venues),
      topReferrers: topN(referrers),
      topSources: topN(sources),
      daily,
    };
    this.cache.set(days, { at: Date.now(), summary });
    return summary;
  }
}

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topN(map: Map<string, number>): CountEntry[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}
