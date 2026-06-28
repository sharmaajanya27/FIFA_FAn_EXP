/**
 * Anonymous fan-event engagement handlers (PRD v1).
 *
 * Account-free: each request carries a device-scoped `anonId` instead of an
 * authenticated user. Covers the three v1 interactions around a fan event:
 *   · RSVP   — POST /events/:id/rsvp        ("I'm going" + optional team)
 *   · Vibe   — POST /events/:id/vibes       (live atmosphere post)
 *   · Review — POST /events/:id/reviews     (post-event rating)
 * plus the read surfaces backing the dedicated event page.
 */
import type { Container } from "../container.js";
import { VIBE_MAX, VIBE_MIN } from "../domain/engagement.js";
import {
  type ApiRequest,
  type ApiResponse,
  bodyField,
  created,
  notFound,
  ok,
  requireAnonId,
  requireField,
  requireIntInRange,
} from "../http/types.js";

const eventId = (req: ApiRequest): string => req.params.id ?? "";

/** GET /events/:id?anonId — event detail with RSVP + review summaries. */
export const getEvent =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = eventId(req);
    const event = await c.discovery.eventById(id);
    if (!event) return notFound(`Event not found: ${id}`);
    const anonId = req.query.anonId?.trim() || undefined;
    const [rsvps, reviews] = await Promise.all([
      c.eventEngagement.rsvpSummary(id, anonId),
      c.eventEngagement.reviewSummary(id),
    ]);
    return ok({ event, rsvps, reviews });
  };

/** POST /events/:id/rsvp { anonId[, going, favoriteTeam] } — toggle attendance. */
export const rsvpEvent =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = eventId(req);
    if (!(await c.discovery.eventById(id))) {
      return notFound(`Event not found: ${id}`);
    }
    const anonId = requireAnonId(req);
    await c.eventEngagement.rsvp(id, anonId, {
      going: bodyField<boolean>(req, "going"),
      favoriteTeam: bodyField<string>(req, "favoriteTeam"),
    });
    return ok(await c.eventEngagement.rsvpSummary(id, anonId));
  };

/** GET /events/:id/rsvps?anonId — attendance summary. */
export const listRsvps =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const anonId = req.query.anonId?.trim() || undefined;
    return ok(await c.eventEngagement.rsvpSummary(eventId(req), anonId));
  };

/** POST /events/:id/vibes { anonId, level[, favoriteTeam] } — live energy pulse. */
export const postVibe =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = eventId(req);
    if (!(await c.discovery.eventById(id))) {
      return notFound(`Event not found: ${id}`);
    }
    const anonId = requireAnonId(req);
    const vibe = await c.eventEngagement.postVibe(
      id,
      anonId,
      requireIntInRange(req, "intensity", VIBE_MIN, VIBE_MAX),
      bodyField<string>(req, "favoriteTeam"),
    );
    return created(vibe);
  };

/** GET /events/:id/vibes — vibe feed, newest first. */
export const listVibes =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const vibes = await c.eventEngagement.listVibes(eventId(req));
    return ok({ count: vibes.length, vibes });
  };

/** POST /events/:id/reviews { anonId, rating[, comment, favoriteTeam] }. */
export const reviewEvent =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const id = eventId(req);
    if (!(await c.discovery.eventById(id))) {
      return notFound(`Event not found: ${id}`);
    }
    const anonId = requireAnonId(req);
    const review = await c.eventEngagement.addReview(
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

/** GET /events/:id/reviews — review summary. */
export const listEventReviews =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    return ok(await c.eventEngagement.reviewSummary(eventId(req)));
  };
