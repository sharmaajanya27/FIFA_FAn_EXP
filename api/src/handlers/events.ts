/** Event-creation handlers (PRD §11 Phase 3). */
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

/**
 * POST /events { city, title, lat, lon, startTime[, kind, venueId, matchId,
 * teams, estAttendance, country] } — create a fan event (auth required).
 */
export const createEvent =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const event = await c.events.create(user, {
      city: requireField<string>(req, "city"),
      title: requireField<string>(req, "title"),
      lat: Number(requireField<number>(req, "lat")),
      lon: Number(requireField<number>(req, "lon")),
      startTime: requireField<string>(req, "startTime"),
      kind: bodyField(req, "kind"),
      country: bodyField<string>(req, "country"),
      venueId: bodyField<string>(req, "venueId"),
      matchId: bodyField<string>(req, "matchId"),
      teams: bodyField<string[]>(req, "teams"),
      estAttendance: bodyField<number>(req, "estAttendance"),
    });
    return created(event);
  };

/** GET /events?city — user-created events for a city. */
export const listEvents =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const city = req.query.city?.trim();
    if (!city) return ok({ count: 0, events: [] });
    const events = await c.events.listForCity(city);
    return ok({ count: events.length, events });
  };
