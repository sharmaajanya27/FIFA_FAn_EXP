/**
 * Anonymous watch-spot (venue) engagement handlers (PRD v1).
 *
 * Mirrors the fan-event engagement handlers: account-free, each request carries
 * a device-scoped `anonId`. Covers the three v1 interactions on a venue:
 *   · Presence — POST /venues/:id/presence  ("I'm here" + optional team)
 *   · Vibe     — POST /venues/:id/vibes      (live atmosphere post)
 *   · Review   — POST /venues/:id/fan-reviews (anonymous rating)
 */
import type { Container } from "../container.js";
import { VIBE_MAX, VIBE_MIN } from "../domain/engagement.js";
import {
  type ApiRequest,
  type ApiResponse,
  bodyField,
  created,
  ok,
  requireAnonId,
  requireField,
  requireIntInRange,
} from "../http/types.js";

const venueId = (req: ApiRequest): string => req.params.id ?? "";

/** POST /venues/:id/presence { anonId[, here, favoriteTeam] } — toggle presence. */
export const setVenuePresence =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = venueId(req);
    const anonId = requireAnonId(req);
    await c.venueEngagement.setPresence(id, anonId, {
      here: bodyField<boolean>(req, "here"),
      favoriteTeam: bodyField<string>(req, "favoriteTeam"),
    });
    return ok(await c.venueEngagement.presenceSummary(id, anonId));
  };

/** GET /venues/:id/presence?anonId — presence summary. */
export const getVenuePresence =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const anonId = req.query.anonId?.trim() || undefined;
    return ok(await c.venueEngagement.presenceSummary(venueId(req), anonId));
  };

/** POST /venues/:id/vibes { anonId, intensity[, favoriteTeam] } — energy pulse. */
export const postVenueVibe =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = venueId(req);
    const anonId = requireAnonId(req);
    const vibe = await c.venueEngagement.postVibe(
      id,
      anonId,
      requireIntInRange(req, "intensity", VIBE_MIN, VIBE_MAX),
      bodyField<string>(req, "favoriteTeam"),
    );
    return created(vibe);
  };

/** GET /venues/:id/vibes — vibe feed, newest first. */
export const listVenueVibes =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const vibes = await c.venueEngagement.listVibes(venueId(req));
    return ok({ count: vibes.length, vibes });
  };

/** POST /venues/:id/fan-reviews { anonId, rating[, comment, favoriteTeam] }. */
export const reviewVenue =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = venueId(req);
    const anonId = requireAnonId(req);
    const review = await c.venueEngagement.addReview(
      id,
      anonId,
      Number(requireField<number>(req, "rating")),
      {
        comment: bodyField<string>(req, "comment"),
        favoriteTeam: bodyField<string>(req, "favoriteTeam"),
      },
    );
    return created(review);
  };

/** GET /venues/:id/fan-reviews — anonymous review summary. */
export const listVenueFanReviews =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    return ok(await c.venueEngagement.reviewSummary(venueId(req)));
  };
