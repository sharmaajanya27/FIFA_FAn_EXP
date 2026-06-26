/**
 * Host Cities + Teams Cleanup: Remove all data except official FIFA World Cup 2026 host cities
 * and teams participating in the tournament.
 *
 * Usage:
 *   npm run cleanup:host-cities -- [--dry-run]
 *
 * Features:
 *   - Keeps only official 2026 host cities (16 total: 11 USA, 2 Canada, 3 Mexico)
 *   - Filters for World Cup 2026 teams
 *   - Removes entire city folders with non-host data
 *   - Updates both local JSONL and Supabase (if DATABASE_URL set)
 */

import { readFileSync, writeFileSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import type { Venue, Match, Event } from "../models/canonical.js";
import { loadEnv } from "../config/env.js";
import { CITIES } from "../config/cities.js";
import { log } from "../util/logger.js";
import { loadDotenv } from "../util/dotenv.js";
import postgres from "postgres";

/**
 * Official FIFA World Cup 2026 host cities (16 total)
 * - USA: 11 cities
 * - Canada: 2 cities
 * - Mexico: 3 cities
 *
 * Note: New York/New Jersey is a single host city covered by two metro slugs
 * ("new-york" + "jersey-city"), so this set has 17 slugs for 16 host cities.
 */
const WORLD_CUP_2026_HOST_CITIES = new Set([
  // USA (11 host cities; NY/NJ spans the new-york + jersey-city slugs)
  "new-york",
  "jersey-city",
  "los-angeles",
  "dallas",
  "houston",
  "kansas-city",
  "boston",
  "san-francisco",
  "seattle",
  "atlanta",
  "miami",
  "philadelphia",

  // Canada (2 host cities)
  "toronto",
  "vancouver",

  // Mexico (3 host cities)
  "mexico-city",
  "guadalajara",
  "monterrey",
]);

/**
 * FIFA World Cup 2026 participating nations (32 teams)
 */
const WORLD_CUP_2026_TEAMS = new Set([
  // CONCACAF
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
  citiesKept: number;
  citiesRemoved: number;
  venuesRemoved: number;
  matchesRemoved: number;
  eventsRemoved: number;
}

function isWorldCupTeam(teamCode: string | null | undefined): boolean {
  if (!teamCode) return false;
  return WORLD_CUP_2026_TEAMS.has(teamCode);
}

function shouldKeepVenue(venue: Venue): boolean {
  if (venue.supportsTeams.length === 0) return true;
  return venue.supportsTeams.some((team) => isWorldCupTeam(team));
}

function shouldKeepMatch(match: Match): boolean {
  const homeIsWC = isWorldCupTeam(match.homeTeam);
  const awayIsWC = isWorldCupTeam(match.awayTeam);
  return homeIsWC && awayIsWC;
}

function shouldKeepEvent(event: Event): boolean {
  if (event.teams.length === 0) return true;
  return event.teams.some((team) => isWorldCupTeam(team));
}

function processJsonlFile(
  filePath: string,
  filterFn: (item: unknown) => boolean,
  dryRun: boolean,
): { kept: unknown[]; removed: number } {
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

async function cleanupSupabase(
  hostCitySlugs: string[],
  dryRun: boolean,
): Promise<CleanupStats> {
  const env = loadEnv();
  if (!env.databaseUrl) {
    log.info("DATABASE_URL not set, skipping Supabase cleanup");
    return {
      citiesKept: hostCitySlugs.length,
      citiesRemoved: 0,
      venuesRemoved: 0,
      matchesRemoved: 0,
      eventsRemoved: 0,
    };
  }

  const sql = postgres(env.databaseUrl, {
    ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : "require",
    prepare: !/:6543\b|pgbouncer=true/.test(env.databaseUrl),
  });

  const stats = {
    citiesKept: hostCitySlugs.length,
    citiesRemoved: 0,
    venuesRemoved: 0,
    matchesRemoved: 0,
    eventsRemoved: 0,
  };

  try {
    log.info("Supabase cleanup", { dryRun, hostCities: hostCitySlugs });

    type CountRow = { count: number };

    // Count venues from non-host cities
    const venueCountResult = await sql<CountRow[]>`
      SELECT COUNT(*)::int as count FROM venues
      WHERE city_slug <> ALL(${hostCitySlugs}::text[])
    `;
    stats.venuesRemoved = venueCountResult[0]?.count ?? 0;

    // Count events from non-host cities
    const eventCountResult = await sql<CountRow[]>`
      SELECT COUNT(*)::int as count FROM events
      WHERE city_slug <> ALL(${hostCitySlugs}::text[])
    `;
    stats.eventsRemoved = eventCountResult[0]?.count ?? 0;

    // Matches are global, not per-city filtered
    stats.matchesRemoved = 0;

    if (!dryRun) {
      // Delete venues from non-host cities
      const venueResult = await sql`
        DELETE FROM venues
        WHERE city_slug <> ALL(${hostCitySlugs}::text[])
        RETURNING id
      `;
      stats.venuesRemoved = venueResult.length;

      // Delete events from non-host cities
      const eventResult = await sql`
        DELETE FROM events
        WHERE city_slug <> ALL(${hostCitySlugs}::text[])
        RETURNING id
      `;
      stats.eventsRemoved = eventResult.length;

      log.info("Supabase cleanup complete", {
        venuesDeleted: stats.venuesRemoved,
        eventsDeleted: stats.eventsRemoved,
      });
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

async function cleanupLocalFiles(dryRun: boolean): Promise<CleanupStats> {
  const env = loadEnv();
  const stats = {
    citiesKept: 0,
    citiesRemoved: 0,
    venuesRemoved: 0,
    matchesRemoved: 0,
    eventsRemoved: 0,
  };

  const dataDir = env.dataDir;
  const allDirs = readdirSync(dataDir).filter(
    (f) =>
      f !== ".gitkeep" &&
      f !== "manifest.json" &&
      f !== "analytics" &&
      f !== "engagement",
  );

  for (const dir of allDirs) {
    const isHostCity = WORLD_CUP_2026_HOST_CITIES.has(dir);

    if (!isHostCity) {
      // Remove non-host city directory entirely
      stats.citiesRemoved++;
      const cityPath = join(dataDir, dir);

      if (!dryRun) {
        try {
          rmSync(cityPath, { recursive: true, force: true });
          log.info("Removed non-host city directory", { city: dir });
        } catch (err) {
          log.warn("Could not remove city directory", {
            city: dir,
            error: String(err),
          });
        }
      } else {
        log.info("Would remove non-host city directory", { city: dir });
      }
    } else {
      // Keep host city, but filter data
      stats.citiesKept++;
      const cityPath = join(dataDir, dir);
      const city = CITIES[dir as keyof typeof CITIES];
      if (!city) continue;

      log.info("Processing host city", { city: dir, dryRun });

      // Venues
      const venuesPath = join(cityPath, "venues.jsonl");
      const { removed: venuesRemoved } = processJsonlFile(
        venuesPath,
        (item: unknown) => shouldKeepVenue(item as Venue),
        dryRun,
      );
      stats.venuesRemoved += venuesRemoved;

      // Matches
      const matchesPath = join(cityPath, "matches.jsonl");
      const { removed: matchesRemoved } = processJsonlFile(
        matchesPath,
        (item: unknown) => shouldKeepMatch(item as Match),
        dryRun,
      );
      stats.matchesRemoved += matchesRemoved;

      // Events
      const eventsPath = join(cityPath, "events.jsonl");
      const { removed: eventsRemoved } = processJsonlFile(
        eventsPath,
        (item: unknown) => shouldKeepEvent(item as Event),
        dryRun,
      );
      stats.eventsRemoved += eventsRemoved;

      if (venuesRemoved > 0 || matchesRemoved > 0 || eventsRemoved > 0) {
        log.info("Host city filtered", {
          city: dir,
          venuesRemoved,
          matchesRemoved,
          eventsRemoved,
        });
      }
    }
  }

  return stats;
}

async function main(): Promise<void> {
  loadDotenv();
  const dryRun = process.argv.includes("--dry-run");

  log.info("FIFA World Cup 2026 Host Cities Cleanup", {
    dryRun,
    hostCities: Array.from(WORLD_CUP_2026_HOST_CITIES).sort().join(", "),
    teams: WORLD_CUP_2026_TEAMS.size,
  });

  const localStats = await cleanupLocalFiles(dryRun);
  const supabaseStats = await cleanupSupabase(
    Array.from(WORLD_CUP_2026_HOST_CITIES),
    dryRun,
  );

  const totalStats = {
    citiesKept: localStats.citiesKept,
    citiesRemoved: localStats.citiesRemoved + supabaseStats.citiesRemoved,
    venuesRemoved: localStats.venuesRemoved + supabaseStats.venuesRemoved,
    matchesRemoved: localStats.matchesRemoved + supabaseStats.matchesRemoved,
    eventsRemoved: localStats.eventsRemoved + supabaseStats.eventsRemoved,
  };

  log.info("Host cities cleanup summary", {
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
