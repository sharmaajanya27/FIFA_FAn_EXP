/**
 * Query-time ranking. Combines each venue's precomputed static score with the
 * user-relative signals (distance, team-fan-match) into a final 0..1 score,
 * renormalizing over whichever signals apply (team-fan-match only counts when
 * the user picked a team).
 */
import { RANKING_WEIGHTS } from "../config/ranking.js";
import type { GeoPoint, RankedVenue, Venue } from "../domain/models.js";
import { haversineMeters } from "../util/geo.js";

export interface RankParams {
  origin: GeoPoint;
  radiusMeters: number;
  /** Team code the user supports, if any (enables team-fan-match signal). */
  team?: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Closer = higher; linear falloff to 0 at the search radius edge. */
function distanceScore(distanceMeters: number, radiusMeters: number): number {
  if (radiusMeters <= 0) return 0;
  return clamp01(1 - distanceMeters / radiusMeters);
}

export function rankVenue(
  venue: Venue,
  distanceMeters: number,
  params: RankParams,
): RankedVenue {
  const w = RANKING_WEIGHTS;
  const staticScore = venue.score ?? 0;
  const distScore = distanceScore(distanceMeters, params.radiusMeters);

  let weighted = w.static * staticScore + w.distance * distScore;
  let totalWeight = w.static + w.distance;

  if (params.team) {
    const teamMatch = venue.supportsTeams.includes(params.team) ? 1 : 0;
    weighted += w.teamFanMatch * teamMatch;
    totalWeight += w.teamFanMatch;
  }

  return {
    ...venue,
    distanceMeters: Math.round(distanceMeters),
    finalScore: totalWeight > 0 ? clamp01(weighted / totalWeight) : 0,
  };
}

/**
 * Filter venues to those within radius, rank them, and sort best-first.
 * `kind` optionally restricts venue type (bar/pub/restaurant/…).
 */
export function rankVenues(
  venues: Venue[],
  params: RankParams,
  kind?: string,
): RankedVenue[] {
  const ranked: RankedVenue[] = [];
  for (const v of venues) {
    if (kind && v.kind !== kind) continue;
    const distance = haversineMeters(params.origin, v.geo);
    if (distance > params.radiusMeters) continue;
    ranked.push(rankVenue(v, distance, params));
  }
  ranked.sort((a, b) => b.finalScore - a.finalScore);
  return ranked;
}
