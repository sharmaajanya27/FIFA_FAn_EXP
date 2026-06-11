/**
 * Score (pipeline stage 6): precompute each venue's static ranking score.
 *
 * Combines the source-side signals (rating, attendance proxy = capacity, fan
 * engagement) using the configurable weights from scoring.json. Query-time
 * signals (distance, team-fan-match) are intentionally excluded here — they
 * depend on the requesting user and are applied at discovery time in Phase 1.
 * The static weights are renormalized so the stored score is 0..1.
 */
import type { ScoringConfig } from "../config/scoring.js";
import type { Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function scoreVenues(venues: Venue[], cfg: ScoringConfig): Venue[] {
  const norm = cfg.normalization;
  const weightOf = (key: string) => cfg.weights[key]?.weight ?? 0;

  const wRating = weightOf("userRatings");
  const wAttendance = weightOf("attendance");
  const wEngagement = weightOf("fanEngagement");
  const wShowsMatches = weightOf("showsMatches");
  const staticTotal = wRating + wAttendance + wEngagement + wShowsMatches;

  for (const v of venues) {
    const rating = clamp01((v.ratingAvg ?? 0) / norm.ratingMax);
    const attendance = clamp01((v.capacity ?? 0) / norm.capacityMax);
    const engagement = clamp01((v.engagement ?? 0) / norm.engagementMax);
    const showsMatches = clamp01(v.showsMatches ?? 0);

    const weighted =
      wRating * rating +
      wAttendance * attendance +
      wEngagement * engagement +
      wShowsMatches * showsMatches;

    v.score = staticTotal > 0 ? clamp01(weighted / staticTotal) : 0;
  }

  log.info("score: computed static venue scores", {
    venues: venues.length,
    staticWeight: staticTotal,
  });
  return venues;
}
