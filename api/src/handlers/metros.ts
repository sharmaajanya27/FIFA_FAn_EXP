/** Metro catalog handler (PRD §11 Phase 3 — international expansion). */
import type { Container } from "../container.js";
import { METROS } from "../config/metros.js";
import { type ApiResponse, ok } from "../http/types.js";

/**
 * GET /metros — supported metros with i18n metadata, annotated with whether
 * Phase 0 data has been ingested for each yet.
 */
export const listMetros =
  (c: Container) =>
  async (): Promise<ApiResponse> => {
    const ingested = new Set(await c.repo.listCities());
    const metros = METROS.map((m) => ({ ...m, hasData: ingested.has(m.slug) }));
    return ok({
      count: metros.length,
      available: metros.filter((m) => m.hasData).length,
      metros,
    });
  };
