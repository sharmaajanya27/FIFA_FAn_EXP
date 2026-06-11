/**
 * CLI entrypoint for Phase 0 ingestion.
 *
 * Usage:
 *   npm run ingest -- <city-slug> [more-city-slugs...]
 *   npm run ingest -- jersey-city
 *   npm run ingest -- jersey-city london
 *   npm run ingest -- all
 */
import { CITIES, getCity } from "../config/cities.js";
import { loadEnv } from "../config/env.js";
import { ExcelPublisher } from "../publishers/excelPublisher.js";
import { JsonlPublisher } from "../publishers/jsonlPublisher.js";
import { runPipeline } from "../pipeline/run.js";
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
  const publishers = [
    new JsonlPublisher(env.dataDir),
    new ExcelPublisher(env.dataDir),
  ];

  for (const slug of slugs) {
    const city = getCity(slug);
    const result = await runPipeline(city, env, publishers);
    log.info("ingest: city complete", {
      city: result.city,
      collected: result.collected,
      published: result.published,
    });
  }
}

main().catch((err) => {
  log.error("ingest: fatal", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
