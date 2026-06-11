/** Profile handlers (PRD §7 — fan profiles). */
import type { Container } from "../container.js";
import { ProfileService } from "../services/profiles.js";
import {
  type ApiRequest,
  type ApiResponse,
  bodyField,
  notFound,
  ok,
  requireUser,
} from "../http/types.js";

/** GET /users/:id — public profile. */
export const getProfile =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new ProfileService(c.store);
    const profile = await svc.getPublic(req.params.id ?? "");
    return profile ? ok(profile) : notFound("User not found");
  };

/** PUT /me/profile — update own profile. */
export const updateProfile =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new ProfileService(c.store);
    const updated = await svc.update(user.id, {
      displayName: bodyField<string>(req, "displayName"),
      favoriteTeams: bodyField<string[]>(req, "favoriteTeams"),
      homeCity: bodyField<string>(req, "homeCity"),
      bio: bodyField<string>(req, "bio"),
    });
    return updated ? ok(updated) : notFound("User not found");
  };
