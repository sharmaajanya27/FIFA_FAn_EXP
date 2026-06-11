/** Crowd-level handlers (PRD §7 — live venue crowd levels). */
import type { Container } from "../container.js";
import { CrowdService } from "../services/crowd.js";
import {
  ApiError,
  type ApiRequest,
  type ApiResponse,
  created,
  ok,
  requireField,
  requireUser,
} from "../http/types.js";

/** POST /venues/:id/crowd { level: empty|quiet|lively|packed } */
export const reportCrowd =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const user = requireUser(req);
    const svc = new CrowdService(c.store);
    try {
      const report = await svc.report({
        venueId: req.params.id ?? "",
        user,
        level: requireField<string>(req, "level"),
      });
      return created(report);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : "Invalid report");
    }
  };

/** GET /venues/:id/crowd — live crowd status. */
export const getCrowd =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const svc = new CrowdService(c.store);
    return ok(await svc.status(req.params.id ?? ""));
  };
