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
  /** Anthropic API key for AI recommendations; absent → heuristic fallback. */
  anthropicApiKey?: string;
  /** Claude model id for AI recommendations. */
  aiModel: string;
  /** Lowercased emails allowed to read the analytics/admin dashboard. */
  adminEmails: string[];
  /** Postgres/Supabase connection string. Set → DB-backed; unset → local files. */
  databaseUrl?: string;
  /** Comma-separated allowed origins for CORS. "*" or unset = allow all (dev). */
  allowedOrigins: string[];
  /** true when NODE_ENV=production. */
  isProduction: boolean;
  /** Supabase project URL for JWKS-based request auth. Unset → verification disabled (dev). */
  supabaseUrl?: string;
}

export function loadApiEnv(): ApiEnv {
  return {
    port: Number(process.env.PORT ?? 3001),
    // Default to the sibling ingestion package's output.
    dataDir: process.env.DATA_DIR
      ? resolve(process.env.DATA_DIR)
      : resolve(process.cwd(), "..", "ingestion", "data"),
    defaultRadiusMeters: Number(process.env.DEFAULT_RADIUS_M ?? 5000),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    aiModel: process.env.AI_MODEL ?? "claude-opus-4-8",
    adminEmails: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    databaseUrl: process.env.DATABASE_URL || undefined,
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    isProduction: process.env.NODE_ENV === "production",
    supabaseUrl: process.env.SUPABASE_URL || undefined,
  };
}
