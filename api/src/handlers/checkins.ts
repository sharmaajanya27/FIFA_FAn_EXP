/** Check-in handlers (PRD §7). */
import type { Container } from "../container.js";
import { CheckInService } from "../services/checkins.js";
import {
  type ApiRequest,
  type ApiResponse,
  bodyField,
  created,
  ok,
  requireUser,
} from "../http/types.js";

/** POST /venues/:id/checkins { eventId?, note? } */
export const createCheckIn =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new CheckInService(c.store);
    const checkin = await svc.create({
      venueId: req.params.id ?? "",
      eventId: bodyField<string>(req, "eventId"),
      user,
      note: bodyField<string>(req, "note"),
    });
    return created(checkin);
  };

/** GET /venues/:id/checkins */
export const listVenueCheckIns =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new CheckInService(c.store);
    const checkins = await svc.listForVenue(req.params.id ?? "");
    return ok({ count: checkins.length, checkins });
  };

/** GET /users/:id/checkins */
export const listUserCheckIns =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new CheckInService(c.store);
    const checkins = await svc.listForUser(req.params.id ?? "");
    return ok({ count: checkins.length, checkins });
  };
