/**
 * API configuration. Reads from process.env with defaults so it runs locally
 * with zero setup.
 */
import { resolve } from "node:path";

export interface ApiEnv {
  port: number;
  /** Directory holding the Phase 0 published JSONL (per-city subfolders). */
  dataDir: string;
  /** Default search radius (meters) when a request omits one. */
  defaultRadiusMeters: number;
}

export function loadApiEnv(): ApiEnv {
  return {
    port: Number(process.env.PORT ?? 3001),
    // Default to the sibling ingestion package's output.
    dataDir: process.env.DATA_DIR
      ? resolve(process.env.DATA_DIR)
      : resolve(process.cwd(), "..", "ingestion", "data"),
    defaultRadiusMeters: Number(process.env.DEFAULT_RADIUS_M ?? 5000),
  };
}
