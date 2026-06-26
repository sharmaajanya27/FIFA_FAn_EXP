/**
 * Cleanup script to remove data for teams not participating in FIFA World Cup 2026.
 *
 * Usage:
 *   npm run ts-node -- src/refresh/cleanupWorldCup2026.ts [--dry-run] [--cities <city1,city2>]
 *
 * Features:
 *   - Dry-run mode shows what would be deleted
 *   - Updates both local JSONL files and Supabase (if DATABASE_URL configured)
 *   - Removes venues that only support non-WC teams
 *   - Removes matches between non-WC teams
 *   - Removes events supporting non-WC teams
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Venue, Match, Event } from "../models/canonical.js";
import { loadEnv } from "../config/env.js";
import { CITIES } from "../config/cities.js";
import { log } from "../util/logger.js";
import { loadDotenv } from "../util/dotenv.js";
import postgres from "postgres";

/**
 * FIFA World Cup 2026 participating nations (32 teams)
 * Hosted in USA, Canada, Mexico
 */
const WORLD_CUP_2026_CODES = new Set([
  // CONCACAF (3 hosts + qualifying teams)
  "USA",
  "CAN",
  "MEX",
  "CRC",
  "PAN",
  "JAM",
  "HON",

  // South America
  "ARG",
  "BRA",
  "URU",
  "COL",
  "ECU",
  "PRY",

  // Europe
  "ENG",
  "FRA",
  "GER",
  "ESP",
  "POR",
  "NED",
  "BEL",
  "ITA",
  "CRO",
  "CHE",
  "DEN",
  "SRB",

  // Africa
  "MAR",
  "SEN",
  "CMR",
  "GHA",
  "TUN",

  // Asia/Oceania
  "JPN",
  "KOR",
  "IRN",
  "KSA",
  "AUS",
]);

interface CleanupStats {
  venuesRemoved: number;
  matchesRemoved: number;
  eventsRemoved: number;
}

/**
 * Check if a team is playing in World Cup 2026
 */
function isWorldCupTeam(teamCode: string | null | undefined): boolean {
  if (!teamCode) return false;
  return WORLD_CUP_2026_CODES.has(teamCode);
}

/**
 * Check if a venue should be kept (has at least one WC team or no team affiliation)
 */
function shouldKeepVenue(venue: Venue): boolean {
  // Keep venues with no team affiliations or ones that support WC teams
  if (venue.supportsTeams.length === 0) return true;
  return venue.supportsTeams.some((team) => isWorldCupTeam(team));
}

/**
 * Check if a match should be kept
 */
function shouldKeepMatch(match: Match): boolean {
  const homeIsWC = isWorldCupTeam(match.homeTeam);
  const awayIsWC = isWorldCupTeam(match.awayTeam);
  // Only keep if both teams are WC teams
  return homeIsWC && awayIsWC;
}

/**
 * Check if an event should be kept
 */
function shouldKeepEvent(event: Event): boolean {
  // Keep events with no team affiliations or ones supporting WC teams
  if (event.teams.length === 0) return true;
  return event.teams.some((team) => isWorldCupTeam(team));
}

/**
 * Process JSONL file: read, filter, return stats
 */
function processJsonlFile(
  filePath: string,
  filterFn: (item: unknown) => boolean,
  dryRun: boolean,
): { kept: unknown[]; removed: number } {
  if (!process.argv.includes("--no-files")) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content
        .trim()
        .split("\n")
        .filter((l) => l.length > 0);
      const items = lines.map((line) => JSON.parse(line));
      const kept = items.filter(filterFn);
      const removed = items.length - kept.length;

      if (!dryRun && removed > 0) {
        writeFileSync(
          filePath,
          kept.map((item) => JSON.stringify(item)).join("\n") + "\n",
        );
      }

      return { kept, removed };
    } catch (err) {
      log.warn("Could not process file", { filePath, error: String(err) });
      return { kept: [], removed: 0 };
    }
  }
  return { kept: [], removed: 0 };
}

/**
 * Cleanup Supabase database
 */
async function cleanupSupabase(dryRun: boolean): Promise<CleanupStats> {
  const env = loadEnv();
  if (!env.databaseUrl) {
    log.info("DATABASE_URL not set, skipping Supabase cleanup");
    return { venuesRemoved: 0, matchesRemoved: 0, eventsRemoved: 0 };
  }

  const sql = postgres(env.databaseUrl, {
    ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : "require",
    prepare: !/:6543\b|pgbouncer=true/.test(env.databaseUrl),
  });

  const stats = {
    venuesRemoved: 0,
    matchesRemoved: 0,
    eventsRemoved: 0,
  };

  try {
    log.info("Supabase cleanup", { dryRun, action: "scanning" });

    const wcTeams = Array.from(WORLD_CUP_2026_CODES);

    // Count venues that only support non-WC teams
    type CountRow = { count: number };
    const venueCountResult = await sql<CountRow[]>`
      SELECT COUNT(*)::int as count FROM venues
      WHERE (supports_teams IS NULL OR supports_teams = '{}')
        OR NOT (supports_teams && ${sql(wcTeams)}::text[])
    `;

    stats.venuesRemoved = venueCountResult[0]?.count ?? 0;

    // Count matches between non-WC teams
    const matchCountResult = await sql<CountRow[]>`
      SELECT COUNT(*)::int as count FROM matches
      WHERE home_team NOT = ANY(${sql(wcTeams)}::text[])
        OR away_team NOT = ANY(${sql(wcTeams)}::text[])
    `;

    stats.matchesRemoved = matchCountResult[0]?.count ?? 0;

    // Count events supporting only non-WC teams
    const eventCountResult = await sql<CountRow[]>`
      SELECT COUNT(*)::int as count FROM events
      WHERE (teams IS NULL OR teams = '{}')
        OR NOT (teams && ${sql(wcTeams)}::text[])
    `;

    stats.eventsRemoved = eventCountResult[0]?.count ?? 0;

    if (!dryRun) {
      // Delete venues that only support non-WC teams
      const venueResult = await sql`
        DELETE FROM venues
        WHERE (supports_teams IS NULL OR supports_teams = '{}')
          OR NOT (supports_teams && ${sql(wcTeams)}::text[])
        RETURNING id
      `;

      stats.venuesRemoved = venueResult.length;

      // Delete matches between non-WC teams
      const matchResult = await sql`
        DELETE FROM matches
        WHERE home_team NOT = ANY(${sql(wcTeams)}::text[])
          OR away_team NOT = ANY(${sql(wcTeams)}::text[])
        RETURNING id
      `;

      stats.matchesRemoved = matchResult.length;

      // Delete events supporting only non-WC teams
      const eventResult = await sql`
        DELETE FROM events
        WHERE (teams IS NULL OR teams = '{}')
          OR NOT (teams && ${sql(wcTeams)}::text[])
        RETURNING id
      `;

      stats.eventsRemoved = eventResult.length;

      log.info("Supabase cleanup complete", stats);
    }
  } catch (err) {
    log.error("Supabase cleanup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await sql.end();
  }

  return stats;
}

/**
 * Cleanup local JSONL files
 */
async function cleanupLocalFiles(
  citySlugs: string[],
  dryRun: boolean,
): Promise<CleanupStats> {
  const env = loadEnv();
  const stats = {
    venuesRemoved: 0,
    matchesRemoved: 0,
    eventsRemoved: 0,
  };

  for (const slug of citySlugs) {
    const city = CITIES[slug as keyof typeof CITIES];
    if (!city) {
      log.warn("City not found", { slug });
      continue;
    }

    const cityDir = join(env.dataDir, city.slug);
    log.info("Processing city", { city: city.slug, dryRun });

    // Venues
    const venuesPath = join(cityDir, "venues.jsonl");
    const { removed: venuesRemoved } = processJsonlFile(
      venuesPath,
      (item: unknown) => shouldKeepVenue(item as Venue),
      dryRun,
    );
    stats.venuesRemoved += venuesRemoved;

    // Matches
    const matchesPath = join(cityDir, "matches.jsonl");
    const { removed: matchesRemoved } = processJsonlFile(
      matchesPath,
      (item: unknown) => shouldKeepMatch(item as Match),
      dryRun,
    );
    stats.matchesRemoved += matchesRemoved;

    // Events
    const eventsPath = join(cityDir, "events.jsonl");
    const { removed: eventsRemoved } = processJsonlFile(
      eventsPath,
      (item: unknown) => shouldKeepEvent(item as Event),
      dryRun,
    );
    stats.eventsRemoved += eventsRemoved;

    log.info("City complete", {
      city: city.slug,
      venuesRemoved,
      matchesRemoved,
      eventsRemoved,
    });
  }

  return stats;
}

/**
 * Main cleanup flow
 */
async function main(): Promise<void> {
  loadDotenv();
  const dryRun = process.argv.includes("--dry-run");
  const citiesArg = process.argv.find((arg) => arg.startsWith("--cities="));
  const citySlugs = citiesArg
    ? citiesArg.replace("--cities=", "").split(",")
    : Object.keys(CITIES);

  log.info("World Cup 2026 cleanup", {
    dryRun,
    teams: Array.from(WORLD_CUP_2026_CODES).sort().join(", "),
    cities: citySlugs.join(", "),
  });

  const localStats = await cleanupLocalFiles(citySlugs, dryRun);
  const supabaseStats = await cleanupSupabase(dryRun);

  const totalStats = {
    venuesRemoved: localStats.venuesRemoved + supabaseStats.venuesRemoved,
    matchesRemoved: localStats.matchesRemoved + supabaseStats.matchesRemoved,
    eventsRemoved: localStats.eventsRemoved + supabaseStats.eventsRemoved,
  };

  log.info("Cleanup summary", {
    ...totalStats,
    dryRun,
    mode: dryRun ? "DRY RUN (no changes made)" : "EXECUTED",
  });
}

main().catch((err) => {
  log.error("Fatal error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 1;
});
