/**
 * Query-time ranking. Combines a venue's "is this a sports venue?" content
 * signal (venue-type prior + showsMatches) and its precomputed static score
 * with the user-relative signals (distance, team-fan-match) into a final 0..1
 * score, renormalizing over whichever signals apply (team-fan-match only counts
 * when the user picked a team).
 */
import {
  DEFAULT_KIND_PRIOR,
  KIND_PRIOR,
  RANKING_WEIGHTS,
} from "../config/ranking.js";
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

/**
 * "Is this a place to watch the match?" — blends the venue-type prior (pubs/bars
 * over cafes/restaurants) with the per-venue showsMatches signal. The prior
 * keeps real sports venues on top even for cities whose data predates the
 * showsMatches signal; showsMatches lifts venues with explicit sports tags
 * above their generic peers.
 */
function contentScore(venue: Venue): number {
  const prior = KIND_PRIOR[venue.kind] ?? DEFAULT_KIND_PRIOR;
  const showsMatches = clamp01(venue.showsMatches ?? 0);
  return clamp01(0.55 * prior + 0.65 * showsMatches);
}

export function rankVenue(
  venue: Venue,
  distanceMeters: number,
  params: RankParams,
): RankedVenue {
  const w = RANKING_WEIGHTS;
  const staticScore = venue.score ?? 0;
  const distScore = distanceScore(distanceMeters, params.radiusMeters);
  const content = contentScore(venue);

  let weighted =
    w.content * content + w.static * staticScore + w.distance * distScore;
  let totalWeight = w.content + w.static + w.distance;

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
