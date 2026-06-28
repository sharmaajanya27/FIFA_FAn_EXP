/**
 * Anonymous fan-event engagement (PRD v1).
 *
 * Three interactions, all keyed by a device-scoped anonymous id (`anonId`) and
 * persisted via the write `Store` (local JSON in dev, Supabase/Postgres in
 * production — same `Store` seam as every other engagement feature):
 *
 *   1. RSVP    — "I'm going" (optionally repping a favorite team).
 *   2. Vibe    — a live post about the atmosphere during the event.
 *   3. Review  — a post-event rating (1..5) of how it was.
 *
 * No user accounts are involved: the same `anonId` lets one device toggle its
 * own RSVP, and have one review counted (re-reviewing updates in place).
 */
import {
  clampIntensity,
  dominantKey,
  type EventReview,
  type EventRsvp,
  type EventVibe,
} from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

export interface RsvpSummary {
  eventId: string;
  /** Distinct devices currently going. */
  count: number;
  /** Going-count broken down by repped team code (the "who's here" signal). */
  teams: Record<string, number>;
  /** Whether the querying device (anonId) is currently going. */
  going: boolean;
  /** This device's repped team, if any. */
  favoriteTeam?: string;
}

export interface ReviewSummary {
  eventId: string;
  count: number;
  averageRating: number | null;
  reviews: EventReview[];
}

const MAX_COMMENT_LEN = 500;
/** Vibes within this window count toward live energy (older ones decay out). */
const RECENT_VIBE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/** Per-event engagement aggregate for the discovery list crowd metrics. */
export interface EventAgg {
  going: number;
  vibes: number;
  /** Average crowd-energy intensity (0..10), or undefined if no recent vibes. */
  energy?: number;
  /** Most-repped team among attendees (going). */
  dominantTeam?: string;
}

export class EventEngagementService {
  constructor(private readonly store: Store) {}

  private get rsvps() {
    return this.store.collection<EventRsvp>("event_rsvps");
  }
  private get vibes() {
    return this.store.collection<EventVibe>("event_vibes");
  }
  private get reviews() {
    return this.store.collection<EventReview>("event_reviews");
  }

  // ── RSVP ──────────────────────────────────────────────────────────────────

  /** Toggle/update an anonymous RSVP. Upserts one row per (eventId, anonId). */
  async rsvp(
    eventId: string,
    anonId: string,
    opts: { going?: boolean; favoriteTeam?: string } = {},
  ): Promise<EventRsvp> {
    const going = opts.going ?? true;
    const favoriteTeam = normalizeTeam(opts.favoriteTeam);
    const existing = await this.rsvps.findOne(
      (r) => r.eventId === eventId && r.anonId === anonId,
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated = await this.rsvps.update(existing.id, {
        going,
        favoriteTeam: favoriteTeam ?? existing.favoriteTeam,
        updatedAt: now,
      });
      return updated ?? existing;
    }
    return this.rsvps.insert({
      eventId,
      anonId,
      going,
      favoriteTeam,
      createdAt: now,
      updatedAt: now,
    });
  }

  async rsvpSummary(eventId: string, anonId?: string): Promise<RsvpSummary> {
    const rows = await this.rsvps.find((r) => r.eventId === eventId && r.going);
    const teams: Record<string, number> = {};
    for (const r of rows) {
      if (r.favoriteTeam)
        teams[r.favoriteTeam] = (teams[r.favoriteTeam] ?? 0) + 1;
    }
    const mine = anonId ? rows.find((r) => r.anonId === anonId) : undefined;
    return {
      eventId,
      count: rows.length,
      teams,
      going: Boolean(mine),
      favoriteTeam: mine?.favoriteTeam,
    };
  }

  // ── Vibe posts ──────────────────────────────────────────────────────────

  async postVibe(
    eventId: string,
    anonId: string,
    intensity: number,
    favoriteTeam?: string,
  ): Promise<EventVibe> {
    return this.vibes.insert({
      eventId,
      anonId,
      intensity: clampIntensity(intensity),
      favoriteTeam: normalizeTeam(favoriteTeam),
      createdAt: new Date().toISOString(),
    });
  }

  /** Vibe feed for an event, newest first. */
  async listVibes(eventId: string): Promise<EventVibe[]> {
    return (await this.vibes.find((v) => v.eventId === eventId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  /** Add or update this device's review (one review per anonId per event). */
  async addReview(
    eventId: string,
    anonId: string,
    rating: number,
    opts: { comment?: string; favoriteTeam?: string } = {},
  ): Promise<EventReview> {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    const comment = opts.comment?.trim().slice(0, MAX_COMMENT_LEN) || undefined;
    const favoriteTeam = normalizeTeam(opts.favoriteTeam);
    const existing = await this.reviews.findOne(
      (r) => r.eventId === eventId && r.anonId === anonId,
    );
    if (existing) {
      const updated = await this.reviews.update(existing.id, {
        rating: clamped,
        comment,
        favoriteTeam: favoriteTeam ?? existing.favoriteTeam,
      });
      return updated ?? existing;
    }
    return this.reviews.insert({
      eventId,
      anonId,
      rating: clamped,
      comment,
      favoriteTeam,
      createdAt: new Date().toISOString(),
    });
  }

  async reviewSummary(eventId: string): Promise<ReviewSummary> {
    const reviews = (
      await this.reviews.find((r) => r.eventId === eventId)
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const averageRating =
      reviews.length === 0
        ? null
        : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { eventId, count: reviews.length, averageRating, reviews };
  }

  /**
   * Per-event aggregates (going count, vibe count, recent energy, dominant
   * team) for the discovery list crowd metrics. One pass per collection.
   */
  async aggregates(): Promise<Map<string, EventAgg>> {
    const [rsvps, vibes] = await Promise.all([
      this.rsvps.all(),
      this.vibes.all(),
    ]);
    const out = new Map<string, EventAgg>();
    const teamTally = new Map<string, Record<string, number>>();
    const energy = new Map<string, { sum: number; count: number }>();
    const recentCutoff = Date.now() - RECENT_VIBE_WINDOW_MS;
    const get = (id: string): EventAgg => {
      const cur = out.get(id) ?? { going: 0, vibes: 0 };
      out.set(id, cur);
      return cur;
    };

    for (const r of rsvps) {
      if (!r.going) continue;
      get(r.eventId).going += 1;
      if (r.favoriteTeam) {
        const t = teamTally.get(r.eventId) ?? {};
        t[r.favoriteTeam] = (t[r.favoriteTeam] ?? 0) + 1;
        teamTally.set(r.eventId, t);
      }
    }
    for (const v of vibes) {
      get(v.eventId).vibes += 1;
      if (new Date(v.createdAt).getTime() >= recentCutoff) {
        const e = energy.get(v.eventId) ?? { sum: 0, count: 0 };
        e.sum += v.intensity;
        e.count += 1;
        energy.set(v.eventId, e);
      }
    }
    for (const [id, agg] of out) {
      const e = energy.get(id);
      if (e) agg.energy = Math.round((e.sum / e.count) * 10) / 10;
      const dom = dominantKey(teamTally.get(id) ?? {});
      if (dom) agg.dominantTeam = dom;
    }
    return out;
  }
}

function normalizeTeam(code?: string): string | undefined {
  const c = code?.trim().toUpperCase();
  return c ? c : undefined;
}
