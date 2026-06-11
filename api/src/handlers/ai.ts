/** AI recommendation handler (PRD §11 Phase 3). */
import type { Container } from "../container.js";
import {
  type ApiRequest,
  type ApiResponse,
  notFound,
  ok,
  requireFloat,
} from "../http/types.js";

const str = (req: ApiRequest, key: string): string | undefined =>
  req.query[key]?.trim() || undefined;

/**
 * GET /ai/recommendations?city&lat&lon&team[&radius&limit&mode]
 * Matchday recommendation. Defaults to the deterministic "smart" pitch;
 * `mode=ai` is reserved for the Claude workflow and currently returns
 * "coming soon" alongside the smart picks.
 */
export const aiRecommendations =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = str(req, "city");
    if (!city) return notFound("Missing query param: city");
    const team = str(req, "team");
    if (!team) return notFound("Missing query param: team");
    const lat = requireFloat(req, "lat");
    const lon = requireFloat(req, "lon");
    const radius = Number(req.query.radius ?? c.env.defaultRadiusMeters);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const mode = str(req, "mode") === "ai" ? "ai" : "smart";

    const result = await c.aiRecommendations.recommend({
      city,
      origin: { lat, lon },
      radiusMeters: radius,
      team,
      limit,
      mode,
    });
    return ok(result);
  };
