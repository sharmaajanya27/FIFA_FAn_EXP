/** Geocoding handler (PRD §6.1 — search by zip code / neighborhood). */
import type { Container } from "../container.js";
import {
  type ApiRequest,
  type ApiResponse,
  badRequest,
  notFound,
  ok,
} from "../http/types.js";

/**
 * GET /geocode?q&city — resolve a zip code / neighborhood / address to a point
 * the discovery search can center on, biased toward `city` when provided.
 */
export const geocode =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const q = req.query.q?.trim();
    if (!q) return badRequest("Missing query param: q");
    const result = await c.geocode.lookup(q, req.query.city?.trim() || undefined);
    return result ? ok(result) : notFound(`No place found for: ${q}`);
  };
