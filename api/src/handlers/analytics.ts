/** Traffic analytics handlers — public ingest + admin-only summary. */
import type { Container } from "../container.js";
import type { PageContext, Utm } from "../services/analytics.js";
import {
  type ApiRequest,
  type ApiResponse,
  ok,
  requireAdmin,
  requireField,
} from "../http/types.js";

const RANGE_DAYS: Record<string, number> = { today: 1, "7d": 7, "30d": 30 };

/** POST /analytics/pageview — public beacon. Records one pageview. */
export const recordPageView =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    const path = requireField<string>(req, "path");
    const sessionId = requireField<string>(req, "sessionId");
    const body = (req.body ?? {}) as Record<string, unknown>;
    await c.analytics.record({
      path,
      sessionId,
      referrerHost: body.referrerHost as string | undefined,
      context: body.context as PageContext | undefined,
      utm: body.utm as Utm | undefined,
    });
    // Beacons ignore the body; keep it tiny.
    return ok({ ok: true });
  };

/** GET /analytics/summary?range=today|7d|30d — admin only. */
export const analyticsSummary =
  (c: Container) =>
  async (req: ApiRequest): Promise<ApiResponse> => {
    requireAdmin(req, c.env.adminEmails);
    const days = RANGE_DAYS[req.query.range ?? "7d"] ?? 7;
    return ok(await c.analytics.summary(days));
  };
