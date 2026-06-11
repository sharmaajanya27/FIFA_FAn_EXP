/**
 * API handlers (Lambda-style, transport-agnostic). Each is a pure async
 * function of ApiRequest → ApiResponse, with services injected via a container
 * so they're trivially testable and deployable as individual Lambdas.
 */
import type { ApiEnv } from "../config/env.js";
import type { Repository } from "../data/repository.js";
import { DiscoveryService } from "../services/discovery.js";
import { RecommendationService } from "../services/recommendations.js";
import {
  type ApiRequest,
  type ApiResponse,
  notFound,
  ok,
  requireFloat,
} from "../http/types.js";

export interface Container {
  env: ApiEnv;
  repo: Repository;
  discovery: DiscoveryService;
  recommendations: RecommendationService;
}

export function buildContainer(env: ApiEnv, repo: Repository): Container {
  return {
    env,
    repo,
    discovery: new DiscoveryService(repo),
    recommendations: new RecommendationService(repo),
  };
}

const str = (req: ApiRequest, key: string): string | undefined =>
  req.query[key]?.trim() || undefined;

/** GET /cities — list ingested cities. */
export const listCities =
  (c: Container) =>
  async (): Promise<ApiResponse> => {
    return ok({ cities: await c.repo.listCities() });
  };

/**
 * GET /venues/nearby?city&lat&lon&radius&team&kind&limit
 * Ranked venues near a point (PRD §6.1, §6.5).
 */
export const nearbyVenues =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = str(req, "city");
    if (!city) return notFound("Missing query param: city");
    const lat = requireFloat(req, "lat");
    const lon = requireFloat(req, "lon");
    const radius = Number(req.query.radius ?? c.env.defaultRadiusMeters);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const venues = await c.discovery.nearbyVenues({
      city,
      origin: { lat, lon },
      radiusMeters: radius,
      team: str(req, "team"),
      kind: str(req, "kind"),
      limit,
    });
    return ok({ count: venues.length, radiusMeters: radius, venues });
  };

/** GET /venues/:id?city — venue detail (PRD §6.2). */
export const venueById =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = str(req, "city");
    if (!city) return notFound("Missing query param: city");
    const id = req.params.id ?? "";
    const venue = await c.discovery.venueById(city, id);
    return venue ? ok(venue) : notFound(`Venue not found: ${id}`);
  };

/** GET /matches?city&team — fixtures (PRD §6). */
export const matches =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = str(req, "city");
    if (!city) return notFound("Missing query param: city");
    const list = await c.discovery.matches(city, str(req, "team"));
    return ok({ count: list.length, matches: list });
  };

/** GET /events/nearby?city&lat&lon&radius&team — fan events near a point. */
export const nearbyEvents =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = str(req, "city");
    if (!city) return notFound("Missing query param: city");
    const lat = requireFloat(req, "lat");
    const lon = requireFloat(req, "lon");
    const radius = Number(req.query.radius ?? c.env.defaultRadiusMeters);
    const list = await c.discovery.nearbyEvents({
      city,
      origin: { lat, lon },
      radiusMeters: radius,
      team: str(req, "team"),
    });
    return ok({ count: list.length, events: list });
  };

/**
 * GET /recommendations?city&lat&lon&team&radius&limit
 * Personalized venue recommendations by team + location (PRD §6.6).
 */
export const recommendations =
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

    const result = await c.recommendations.recommend({
      city,
      origin: { lat, lon },
      radiusMeters: radius,
      team,
      limit,
    });
    return ok(result);
  };
