/**
 * Live venue crowd levels (PRD §7). Fans report how busy a venue is; the
 * service aggregates recent reports (last 2h) into a single live indicator.
 */
import type { CrowdLevel, CrowdReport, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

const ORDER: CrowdLevel[] = ["empty", "quiet", "lively", "packed"];
const RECENT_MS = 2 * 60 * 60 * 1000;

function isLevel(value: unknown): value is CrowdLevel {
  return typeof value === "string" && (ORDER as string[]).includes(value);
}

export interface CrowdStatus {
  venueId: string;
  level: CrowdLevel | null;
  recentReports: number;
  updatedAt: string | null;
}

export class CrowdService {
  constructor(private readonly store: Store) {}
  private get reports() {
    return this.store.collection<CrowdReport>("crowd_reports");
  }

  async report(input: {
    venueId: string;
    user: User;
    level: string;
  }): Promise<CrowdReport> {
    if (!isLevel(input.level)) {
      throw new Error(`Invalid crowd level: ${input.level}`);
    }
    return this.reports.insert({
      venueId: input.venueId,
      userId: input.user.id,
      level: input.level,
      createdAt: new Date().toISOString(),
    });
  }

  /** Live status = average of reports in the last 2h, snapped to a level. */
  async status(venueId: string): Promise<CrowdStatus> {
    const cutoff = Date.now() - RECENT_MS;
    const recent = (await this.reports.find((r) => r.venueId === venueId)).filter(
      (r) => new Date(r.createdAt).getTime() >= cutoff,
    );
    if (recent.length === 0) {
      return { venueId, level: null, recentReports: 0, updatedAt: null };
    }
    const avg =
      recent.reduce((s, r) => s + ORDER.indexOf(r.level), 0) / recent.length;
    const level = ORDER[Math.round(avg)] ?? null;
    const updatedAt = recent
      .map((r) => r.createdAt)
      .sort((a, b) => b.localeCompare(a))[0]!;
    return { venueId, level, recentReports: recent.length, updatedAt };
  }
}

export const CROWD_LEVELS = ORDER;
