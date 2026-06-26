/**
 * Anonymous watch-spot (venue) engagement (PRD v1).
 *
 * Mirrors EventEngagementService so the two surfaces behave identically. Three
 * interactions, all keyed by a device-scoped anonymous id (`anonId`) and
 * persisted via the write `Store` (local JSON in dev, Supabase/Postgres in
 * production):
 *
 *   1. Presence — "I'm here" (optionally repping a favorite team).
 *   2. Vibe     — a live post about the venue's current atmosphere.
 *   3. Review   — a rating (1..5) of the spot.
 *
 * Unlike events, a venue is persistent (no kickoff), so all three are always
 * available rather than phase-gated.
 */
import {
  clampIntensity,
  dominantKey,
  vibeEnergyNorm,
  type VenuePresence,
  type VenueReview,
  type VenueVibe,
} from "../domain/engagement.js";
import type { Venue } from "../domain/models.js";
import type { Store } from "../store/jsonStore.js";
import type { VenueOverlay } from "./discovery.js";

export interface PresenceSummary {
  venueId: string;
  /** Distinct devices currently here. */
  count: number;
  /** Here-count broken down by repped team code. */
  teams: Record<string, number>;
  /** Whether the querying device (anonId) is currently here. */
  here: boolean;
  /** This device's repped team, if any. */
  favoriteTeam?: string;
}

export interface VenueReviewSummary {
  venueId: string;
  count: number;
  averageRating: number | null;
  reviews: VenueReview[];
}

const MAX_COMMENT_LEN = 500;

// ── Ranking-overlay tuning ──────────────────────────────────────────────────
/** Vibes within this window count toward live buzz (older ones decay out). */
const RECENT_VIBE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
/** Saturation constant for buzz/review curves (n/(n+k)). */
const BUZZ_SATURATION = 3;
const REVIEW_SATURATION = 3;
/** Live-buzz mix: weight of "here now" vs recent energy (sum to 1). */
const BUZZ_HERE_SHARE = 0.6;
const BUZZ_VIBE_SHARE = 0.4;
/** Cap on how far reviews can pull the static score (keeps Phase 0 relevant). */
const REVIEW_MAX_CONFIDENCE = 0.6;

export class VenueEngagementService {
  constructor(private readonly store: Store) {}
  private get presence() {
    return this.store.collection<VenuePresence>("venue_presence");
  }
  private get vibes() {
    return this.store.collection<VenueVibe>("venue_vibes");
  }
  private get reviews() {
    return this.store.collection<VenueReview>("venue_reviews");
  }

  // ── Presence ("I'm here") ───────────────────────────────────────────────

  async setPresence(
    venueId: string,
    anonId: string,
    opts: { here?: boolean; favoriteTeam?: string } = {},
  ): Promise<VenuePresence> {
    const here = opts.here ?? true;
    const favoriteTeam = normalizeTeam(opts.favoriteTeam);
    const existing = await this.presence.findOne(
      (r) => r.venueId === venueId && r.anonId === anonId,
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated = await this.presence.update(existing.id, {
        here,
        favoriteTeam: favoriteTeam ?? existing.favoriteTeam,
        updatedAt: now,
      });
      return updated ?? existing;
    }
    return this.presence.insert({
      venueId,
      anonId,
      here,
      favoriteTeam,
      createdAt: now,
      updatedAt: now,
    });
  }

  async presenceSummary(
    venueId: string,
    anonId?: string,
  ): Promise<PresenceSummary> {
    const rows = await this.presence.find(
      (r) => r.venueId === venueId && r.here,
    );
    const teams: Record<string, number> = {};
    for (const r of rows) {
      if (r.favoriteTeam)
        teams[r.favoriteTeam] = (teams[r.favoriteTeam] ?? 0) + 1;
    }
    const mine = anonId ? rows.find((r) => r.anonId === anonId) : undefined;
    return {
      venueId,
      count: rows.length,
      teams,
      here: Boolean(mine),
      favoriteTeam: mine?.favoriteTeam,
    };
  }

  // ── Vibe posts ──────────────────────────────────────────────────────────

  async postVibe(
    venueId: string,
    anonId: string,
    intensity: number,
    favoriteTeam?: string,
  ): Promise<VenueVibe> {
    return this.vibes.insert({
      venueId,
      anonId,
      intensity: clampIntensity(intensity),
      favoriteTeam: normalizeTeam(favoriteTeam),
      createdAt: new Date().toISOString(),
    });
  }

  async listVibes(venueId: string): Promise<VenueVibe[]> {
    return (await this.vibes.find((v) => v.venueId === venueId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  // ── Reviews ───────────────────────────────────────────────────────────────

  async addReview(
    venueId: string,
    anonId: string,
    rating: number,
    opts: { comment?: string; favoriteTeam?: string } = {},
  ): Promise<VenueReview> {
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    const comment = opts.comment?.trim().slice(0, MAX_COMMENT_LEN) || undefined;
    const favoriteTeam = normalizeTeam(opts.favoriteTeam);
    const existing = await this.reviews.findOne(
      (r) => r.venueId === venueId && r.anonId === anonId,
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
      venueId,
      anonId,
      rating: clamped,
      comment,
      favoriteTeam,
      createdAt: new Date().toISOString(),
    });
  }

  async reviewSummary(venueId: string): Promise<VenueReviewSummary> {
    const reviews = (
      await this.reviews.find((r) => r.venueId === venueId)
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const averageRating =
      reviews.length === 0
        ? null
        : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { venueId, count: reviews.length, averageRating, reviews };
  }

  // ── Discovery overlay ─────────────────────────────────────────────────────

  /**
   * Annotate venues with anonymous engagement so it both shows on the list and
   * moves ranking (PRD §6.5). Implements the DiscoveryService `VenueOverlay`:
   *
   *   · Reviews  → blended into the static `venue.score` (community consensus;
   *                more reviews = more weight, capped so Phase 0 still counts).
   *   · Buzz     → a 0..1 live signal from fans currently "here" + recent vibe
   *                energy, surfaced as `venue.buzz` for the buzz ranking term.
   *
   * Also attaches display fields (fanRating, hereCount, vibeCount, energy,
   * dominantTeam). Builds the per-venue maps once, then O(1) lookups per venue.
   */
  async applyOverlay(venues: Venue[]): Promise<Venue[]> {
    const [reviews, presence, vibes] = await Promise.all([
      this.reviews.all(),
      this.presence.all(),
      this.vibes.all(),
    ]);
    if (reviews.length === 0 && presence.length === 0 && vibes.length === 0) {
      return venues;
    }

    const ratings = new Map<string, { total: number; count: number }>();
    for (const r of reviews) {
      const cur = ratings.get(r.venueId) ?? { total: 0, count: 0 };
      cur.total += r.rating;
      cur.count += 1;
      ratings.set(r.venueId, cur);
    }
    // "Here now" counts + repped-team tally per venue (dominant team).
    const here = new Map<string, number>();
    const hereTeams = new Map<string, Record<string, number>>();
    for (const p of presence) {
      if (!p.here) continue;
      here.set(p.venueId, (here.get(p.venueId) ?? 0) + 1);
      if (p.favoriteTeam) {
        const t = hereTeams.get(p.venueId) ?? {};
        t[p.favoriteTeam] = (t[p.favoriteTeam] ?? 0) + 1;
        hereTeams.set(p.venueId, t);
      }
    }
    // Vibe pulses: total count + recent energy (sum of level scores + count).
    const vibeCounts = new Map<string, number>();
    const recentEnergy = new Map<string, { sum: number; count: number }>();
    const recentCutoff = Date.now() - RECENT_VIBE_WINDOW_MS;
    for (const v of vibes) {
      vibeCounts.set(v.venueId, (vibeCounts.get(v.venueId) ?? 0) + 1);
      if (new Date(v.createdAt).getTime() >= recentCutoff) {
        const cur = recentEnergy.get(v.venueId) ?? { sum: 0, count: 0 };
        cur.sum += v.intensity;
        cur.count += 1;
        recentEnergy.set(v.venueId, cur);
      }
    }

    return venues.map((v) => {
      const rating = ratings.get(v.id);
      const hereCount = here.get(v.id);
      const vibeCount = vibeCounts.get(v.id);
      if (!rating && !hereCount && !vibeCount) return v;

      const recent = recentEnergy.get(v.id);
      const avgEnergy = recent ? recent.sum / recent.count : 0;

      // Live buzz: saturating mix of "here now" and recent vibe ENERGY (volume
      // × intensity), so a loud, busy spot rises but no single venue dominates.
      const buzz =
        BUZZ_HERE_SHARE * saturate(hereCount ?? 0, BUZZ_SATURATION) +
        BUZZ_VIBE_SHARE *
          (recent
            ? saturate(recent.count, BUZZ_SATURATION) *
              vibeEnergyNorm(avgEnergy)
            : 0);

      // Reviews → blend community consensus into the static score. Confidence
      // grows with review count but is capped so the Phase 0 score still counts.
      let score = v.score;
      if (rating) {
        const avg = rating.total / rating.count;
        const confidence =
          REVIEW_MAX_CONFIDENCE * saturate(rating.count, REVIEW_SATURATION);
        score = clamp01(
          (v.score ?? 0) * (1 - confidence) + (avg / 5) * confidence,
        );
      }

      const dominantTeam = dominantKey(hereTeams.get(v.id) ?? {});

      return {
        ...v,
        ...(score !== undefined ? { score } : {}),
        ...(buzz > 0 ? { buzz } : {}),
        ...(recent ? { energy: Math.round(avgEnergy * 10) / 10 } : {}),
        ...(dominantTeam ? { dominantTeam } : {}),
        ...(rating
          ? {
              fanRating: Math.round((rating.total / rating.count) * 10) / 10,
              fanRatingCount: rating.count,
            }
          : {}),
        ...(hereCount ? { hereCount } : {}),
        ...(vibeCount ? { vibeCount } : {}),
      };
    });
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** Saturating curve n/(n+k): 1→0.25, 3→0.5, 9→0.75 at k=3. */
const saturate = (n: number, k: number) => (n <= 0 ? 0 : n / (n + k));

function normalizeTeam(code?: string): string | undefined {
  const c = code?.trim().toUpperCase();
  return c ? c : undefined;
}
