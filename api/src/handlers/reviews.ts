/** Review handlers (PRD §7 — venue reviews). */
import type { Container } from "../container.js";
import {
  type ApiRequest,
  type ApiResponse,
  bodyField,
  created,
  ok,
  requireField,
  requireUser,
} from "../http/types.js";

/** POST /venues/:id/reviews { rating, comment? } */
export const createReview =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const venueId = req.params.id ?? "";
    const rating = requireField<number>(req, "rating");
    const review = await c.reviews.create({
      venueId,
      user,
      rating: Number(rating),
      comment: bodyField<string>(req, "comment"),
    });
    return created(review);
  };

/** GET /venues/:id/reviews — list + aggregate. */
export const listReviews =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const venueId = req.params.id ?? "";
    const reviews = await c.reviews.listForVenue(venueId);
    const count = reviews.length;
    const avg =
      count > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : null;
    return ok({ venueId, count, averageRating: avg, reviews });
  };
