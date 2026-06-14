/** Business-account handlers (PRD §8 — listings, events, admin review). */
import type { Container } from "../container.js";
import {
  type ApiRequest,
  type ApiResponse,
  created,
  forbidden,
  ok,
  requireAdmin,
  requireField,
  requireUser,
} from "../http/types.js";

/**
 * POST /business/listings — create a venue listing (business account).
 * { name, city, lat, lon[, kind, address, website, phone, country,
 *   supportsTeams, capacity] }
 */
export const createListing =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    if (user.accountType !== "business") {
      return forbidden("Create a business account to list a venue.");
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const listing = await c.business.createListing(user, {
      name: requireField<string>(req, "name"),
      city: requireField<string>(req, "city"),
      lat: Number(body.lat),
      lon: Number(body.lon),
      kind: body.kind as string | undefined,
      address: body.address as string | undefined,
      website: body.website as string | undefined,
      phone: body.phone as string | undefined,
      country: body.country as string | undefined,
      supportsTeams: (body.supportsTeams as string[]) ?? [],
      capacity: body.capacity ? Number(body.capacity) : undefined,
    });
    return created(listing);
  };

/** GET /business/listings/mine — the signed-in business's own listings. */
export const listMyListings =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const listings = await c.business.listByOwner(user.id);
    return ok({ count: listings.length, listings });
  };

/**
 * GET /admin/business — every business listing + every user/business event.
 * Admin-gated (ADMIN_EMAILS); powers the /admin/business review dashboard.
 */
export const adminBusinessSummary =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    requireAdmin(req, c.env.adminEmails);
    const [listings, events] = await Promise.all([
      c.business.all(),
      c.events.all(),
    ]);
    return ok({
      listings,
      events,
      counts: { listings: listings.length, events: events.length },
    });
  };
