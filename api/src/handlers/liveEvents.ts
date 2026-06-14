/** Live sporting events handler — public, read-only ticker (ESPN-backed). */
import type { Container } from "../container.js";
import { type ApiResponse, ok } from "../http/types.js";

/** GET /live/events — live + upcoming matches across several leagues. */
export const listLiveEvents =
  (c: Container) => async (): Promise<ApiResponse> => {
    const events = await c.liveEvents.list();
    return ok({ count: events.length, events });
  };
