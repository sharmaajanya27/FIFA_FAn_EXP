/**
 * Environment configuration. Reads from process.env (optionally hydrated from a
 * .env file by the CLI) and applies sensible defaults so the pipeline runs with
 * zero setup.
 */
export interface Env {
  overpassUrl: string;
  userAgent: string;
  overpassThrottleMs: number;
  dataDir: string;
  /** Optional live fixtures JSON URL; falls back to the bundled seed. */
  fixturesUrl?: string;
}

export function loadEnv(): Env {
  return {
    overpassUrl:
      process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter",
    userAgent:
      process.env.INGEST_USER_AGENT ??
      "FanMatch-Ingestion/0.0.1 (contact: you@example.com)",
    overpassThrottleMs: Number(process.env.OVERPASS_THROTTLE_MS ?? 1500),
    dataDir: process.env.DATA_DIR ?? "data",
    fixturesUrl: process.env.FIXTURES_URL || undefined,
  };
}
