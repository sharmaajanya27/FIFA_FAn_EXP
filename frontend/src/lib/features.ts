/**
 * v1 feature flags.
 *
 * The discovery experience (venues, map, ranking, recommendations, AI matchday
 * pick, live scores, fan-event viewing) ships in v1. Login-gated engagement
 * features are hidden for now but their code is retained in the repo — flip a
 * flag here to re-enable a feature in the UI without re-implementing it.
 */
export const FEATURES = {
  /** Login / signup (AuthBar) and the authenticated-user context. */
  auth: false,
  /** Team community feed (requires auth). */
  community: false,
  /**
   * Venue engagement writes: reviews, check-ins, crowd reports, photo uploads.
   * Read-only displays (crowd estimate, existing reviews/photos) always show.
   */
  engagement: false,
  /** Business claim/feature on a venue, and the "create a fan event" form. */
  business: false,
} as const;
