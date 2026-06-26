/**
 * Ranking weights for discovery (PRD §6.5).
 *
 * The dominant axis is `content`: "is this actually a place to watch the match?"
 * It blends a venue-type prior (pubs/bars rank above cafes/restaurants) with the
 * per-venue `showsMatches` signal computed in Phase 0. This keeps real sports
 * bars at the top even when the richer signals below are sparse.
 *
 * The remaining axes are the precomputed `static` venue.score (ratings /
 * attendance / engagement, populated when those sources land) plus the
 * query-time signals — `teamFanMatch` and `distance` — which depend on the
 * requesting user (their chosen team and location).
 *
 * `buzz` is the live signal: fans currently "here" + recent vibe posts, so a
 * spot that's actively buzzing right now gets a (decaying) lift. Anonymous fan
 * reviews feed `static` (see VenueEngagementService.applyOverlay).
 *
 *   Venue Score = 50% content  + 20% static    + 10% buzz
 *               + 15% team-fan-match + 10% distance   (renormalized per query)
 */
export interface RankingWeights {
  /** Venue-type prior + shows-matches signal — the "is this a sports venue" axis. */
  content: number;
  /** Combined weight of the precomputed static venue.score. */
  static: number;
  teamFanMatch: number;
  distance: number;
  /** Live buzz: fans currently here + recent vibe posts (0..1). */
  buzz: number;
}

export const RANKING_WEIGHTS: RankingWeights = {
  content: 0.5,
  static: 0.2,
  teamFanMatch: 0.15,
  distance: 0.1,
  buzz: 0.1,
};

/**
 * Baseline likelihood (0..1) that a venue of a given kind shows live matches and
 * welcomes fans. Acts as a prior so a sports bar outranks a quiet cafe even when
 * a venue has no explicit "shows matches" tags. Tunable without a code deploy.
 */
export const KIND_PRIOR: Record<string, number> = {
  fan_zone: 0.9,
  pub: 0.7,
  bar: 0.6,
  restaurant: 0.3,
  other: 0.25,
  cafe: 0.1,
};

/** Prior for an unknown/missing venue kind. */
export const DEFAULT_KIND_PRIOR = 0.25;
