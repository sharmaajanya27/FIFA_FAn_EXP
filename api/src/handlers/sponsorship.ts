/** Sponsorship-marketplace handlers (PRD §8 + §11 Phase 3). */
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

/** POST /venues/:id/claim { businessName } */
export const claimVenue =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const claim = await c.sponsorship.claim({
      venueId: req.params.id ?? "",
      user,
      businessName: requireField<string>(req, "businessName"),
    });
    return created(claim);
  };

/** POST /venues/:id/feature { package, days? } */
export const featureVenue =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const feature = await c.sponsorship.feature({
      venueId: req.params.id ?? "",
      user,
      package: requireField<string>(req, "package"),
      days: bodyField<number>(req, "days"),
    });
    return created(feature);
  };

/** GET /venues/:id/listing — claim + featured status. */
export const getListing =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    return ok(await c.sponsorship.listing(req.params.id ?? ""));
  };
