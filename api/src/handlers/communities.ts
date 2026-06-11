/** Community handlers (PRD §7 — team communities). */
import type { Container } from "../container.js";
import { CommunityService } from "../services/communities.js";
import {
  type ApiRequest,
  type ApiResponse,
  created,
  notFound,
  ok,
  requireField,
  requireUser,
} from "../http/types.js";

/** POST /communities/:team/posts { text } */
export const createPost =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new CommunityService(c.store);
    const post = await svc.createPost({
      team: req.params.team ?? "",
      user,
      text: requireField<string>(req, "text"),
    });
    return created(post);
  };

/** GET /communities/:team/posts */
export const listFeed =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new CommunityService(c.store);
    const posts = await svc.feed(req.params.team ?? "");
    return ok({ team: (req.params.team ?? "").toUpperCase(), count: posts.length, posts });
  };

/** POST /posts/:id/like — toggle like for the current user. */
export const toggleLike =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new CommunityService(c.store);
    const post = await svc.toggleLike(req.params.id ?? "", user.id);
    return post ? ok(post) : notFound("Post not found");
  };
