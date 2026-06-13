/**
 * CLI entrypoint for Phase 0 ingestion.
 *
 * Usage:
 *   npm run ingest -- <city-slug> [more-city-slugs...]
 *   npm run ingest -- jersey-city
 *   npm run ingest -- all
 *
 * Runs the full pipeline (venues + matches + events → enrich → score →
 * publish) and writes a per-city data-quality report plus a source manifest.
 */
import { CITIES, getCity } from "../config/cities.js";
import { loadEnv } from "../config/env.js";
import { loadScoringConfig } from "../config/scoring.js";
import { normalizeMatches } from "../pipeline/normalize.js";
import { runPipeline } from "../pipeline/run.js";
import postgres from "postgres";
import { ExcelPublisher } from "../publishers/excelPublisher.js";
import { JsonlPublisher } from "../publishers/jsonlPublisher.js";
import { SupabasePublisher } from "../publishers/supabasePublisher.js";
import type { Publisher } from "../publishers/types.js";
import { SourceManifest } from "../refresh/manifest.js";
import { FixturesConnector } from "../sources/fixtures/fixtures.js";
import { loadDotenv } from "../util/dotenv.js";
import { log } from "../util/logger.js";

async function main(): Promise<void> {
  loadDotenv();
  const env = loadEnv();

  const args = process.argv.slice(2);
  if (args.length === 0) {
    const known = Object.keys(CITIES).join(", ");
    log.error("No city specified.", { usage: "npm run ingest -- <city-slug>" });
    log.info("Known cities", { cities: known, special: "all" });
    process.exitCode = 1;
    return;
  }

  const slugs = args.includes("all") ? Object.keys(CITIES) : args;

  // Shared, city-agnostic setup collected once.
  const scoring = await loadScoringConfig();
  const manifest = new SourceManifest(env.dataDir);
  await manifest.load();

  const fixtures = new FixturesConnector(env);
  const rawMatches = await fixtures.collectMatches();
  const matches = normalizeMatches(rawMatches);
  manifest.record(fixtures.id, "_global", matches.length);

  const publishers: Publisher[] = [
    new JsonlPublisher(env.dataDir),
    new ExcelPublisher(env.dataDir),
  ];
  // Dual-write to Postgres/Supabase when configured (JSONL stays the local
  // source of truth + rollback path).
  const sql = env.databaseUrl
    ? postgres(env.databaseUrl, {
        ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : "require",
        // Transaction pooler (port 6543) rejects prepared statements.
        prepare: !/:6543\b|pgbouncer=true/.test(env.databaseUrl),
        max: 4,
      })
    : undefined;
  if (sql) {
    publishers.push(new SupabasePublisher(sql));
    log.info("ingest: dual-write to Postgres enabled");
  }

  const failures: string[] = [];
  try {
    for (const slug of slugs) {
      const city = getCity(slug);
      try {
        const result = await runPipeline(city, {
          env,
          publishers,
          matches,
          scoring,
          manifest,
        });
        log.info("ingest: city complete", {
          city: result.city,
          venues: result.venues.length,
          events: result.events.length,
        });
      } catch (err) {
        // Isolate per-city failures so one bad source doesn't abort the batch.
        failures.push(slug);
        log.error("ingest: city failed, continuing", {
          city: slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await manifest.save();
  } finally {
    // Close the DB pool so the process can exit.
    if (sql) await sql.end({ timeout: 5 });
  }

  if (failures.length > 0) {
    log.warn("ingest: completed with failures", { failed: failures });
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log.error("ingest: fatal", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 1;
});
