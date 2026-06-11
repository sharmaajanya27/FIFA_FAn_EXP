/**
 * Ranking weights for discovery (PRD §6.5). These mirror the ingestion
 * scoring.json: the `static` portion (ratings + attendance + engagement) was
 * precomputed into venue.score during Phase 0; the `queryTime` portion
 * (distance + team-fan-match) is applied here because it depends on the
 * requesting user (their location and chosen team).
 *
 *   Venue Score = 30% ratings + 25% attendance + 20% engagement  ← static (0.75)
 *               + 15% team-fan-match + 10% distance              ← query-time (0.25)
 */
export interface RankingWeights {
  /** Combined weight of the precomputed static venue.score. */
  static: number;
  teamFanMatch: number;
  distance: number;
}

export const RANKING_WEIGHTS: RankingWeights = {
  static: 0.75,
  teamFanMatch: 0.15,
  distance: 0.1,
};
