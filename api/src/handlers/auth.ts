/** Auth + current-user handlers (PRD §7 — accounts). */
import type { Container } from "../container.js";
import { toPublicUser } from "../domain/engagement.js";
import {
  type ApiRequest,
  type ApiResponse,
  created,
  ok,
  requireField,
  requireUser,
  unauthorized,
} from "../http/types.js";

/** POST /auth/register { email, displayName, favoriteTeams?, homeCity? } */
export const register =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const email = requireField<string>(req, "email");
    const displayName = requireField<string>(req, "displayName");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await c.auth.register({
      email,
      displayName,
      favoriteTeams: (body.favoriteTeams as string[]) ?? [],
      homeCity: body.homeCity as string | undefined,
      accountType: body.accountType === "business" ? "business" : "fan",
      businessName: body.businessName as string | undefined,
    });
    return created({ token: result.token, user: toPublicUser(result.user) });
  };

/** POST /auth/login { email } */
export const login =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const email = requireField<string>(req, "email");
    const result = await c.auth.login(email);
    if (!result) return unauthorized("No account for that email — register first.");
    return ok({ token: result.token, user: toPublicUser(result.user) });
  };

/** GET /me — the authenticated user. */
export const me =
  () =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    return ok({ user: toPublicUser(user) });
  };
