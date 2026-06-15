/**
 * Supporter-venue overlay (pipeline stage 5b — the MOAT layer).
 *
 * Applies a curated, human-verified supporter dataset (src/seeds/supporters.<slug>.json)
 * onto the scraped OSM venues. This is the signal Google/OSM do not structure:
 * "where do <team>'s fans actually watch, and does this place really show matches?"
 *
 * Each seed entry is matched to a scraped venue by name similarity within a small
 * proximity radius. On a match we overlay the verified `supportsTeams`, lift
 * `showsMatches` to the curated confidence, optionally promote the venue to a
 * fan_zone, and record provenance. Seed venues with no OSM match are added as
 * standalone curated venues so we never lose a known supporter spot.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { City } from "../config/cities.js";
import type {
  GeoPoint,
  Source,
  Venue,
  VenueKind,
} from "../models/canonical.js";
import { geohash, haversineMeters } from "../util/geo.js";
import { log } from "../util/logger.js";

const SOURCE_NAME = "supporters-seed";
/** Match a seed entry to a scraped venue only within this radius. */
const MATCH_RADIUS_M = 250;
/** Minimum normalized-name token overlap to accept a match. */
const NAME_SIMILARITY_MIN = 0.5;

interface SupporterSeedVenue {
  name: string;
  geo: GeoPoint;
  kind?: VenueKind;
  teams?: string[];
  officialFanZone?: boolean;
  showsMatches?: number;
  verified?: boolean;
  note?: string;
  url?: string;
}
interface SupporterSeedFile {
  city: string;
  venues: SupporterSeedVenue[];
}

export interface SupporterOverlayStats {
  seedCount: number;
  matched: number;
  added: number;
}

function normName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

/** Token Jaccard similarity on normalized names. */
function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normName(a).split(" ").filter(Boolean));
  const tb = new Set(normName(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

function seedVenueId(slug: string, name: string): string {
  return createHash("sha1")
    .update(`${SOURCE_NAME}:${slug}:${normName(name)}`)
    .digest("hex")
    .slice(0, 16);
}

async function loadSeed(slug: string): Promise<SupporterSeedFile | null> {
  const url = new URL(`../seeds/supporters.${slug}.json`, import.meta.url);
  try {
    const text = await readFile(fileURLToPath(url), "utf8");
    return JSON.parse(text) as SupporterSeedFile;
  } catch {
    return null;
  }
}

/**
 * Overlay the curated supporter seed for `city` onto `venues`. Mutates matched
 * venues in place and appends any unmatched seed venues. Returns the same array
 * plus overlay stats. A no-op (returns input) when the city has no seed file.
 */
export async function applySupporters(
  venues: Venue[],
  city: City,
): Promise<{ venues: Venue[]; stats: SupporterOverlayStats }> {
  const seed = await loadSeed(city.slug);
  if (!seed) {
    log.info("supporters: no seed file for city, skipping", {
      city: city.slug,
    });
    return { venues, stats: { seedCount: 0, matched: 0, added: 0 } };
  }

  const scrapedAt = new Date().toISOString();
  let matched = 0;
  let added = 0;

  for (const entry of seed.venues) {
    const teams = entry.teams ?? [];
    const confidence = entry.showsMatches ?? 0.85;
    const source: Source = {
      name: SOURCE_NAME,
      type: "community",
      scrapedAt,
      externalId: `${city.slug}:${normName(entry.name)}`,
      url: entry.url,
    };

    // Best name match among nearby scraped venues.
    let best: Venue | undefined;
    let bestSim = NAME_SIMILARITY_MIN;
    for (const v of venues) {
      if (haversineMeters(v.geo, entry.geo) > MATCH_RADIUS_M) continue;
      const sim = nameSimilarity(v.name, entry.name);
      if (sim >= bestSim) {
        bestSim = sim;
        best = v;
      }
    }

    if (best) {
      best.supportsTeams = Array.from(
        new Set([...best.supportsTeams, ...teams]),
      );
      best.showsMatches = Math.max(best.showsMatches ?? 0, confidence);
      if (entry.officialFanZone) best.kind = "fan_zone";
      const seen = new Set(
        best.sources.map((s) => `${s.name}:${s.externalId}`),
      );
      if (!seen.has(`${source.name}:${source.externalId}`)) {
        best.sources.push(source);
      }
      matched++;
      continue;
    }

    // No scraped match — add the curated venue so we never lose a known spot.
    venues.push({
      id: seedVenueId(city.slug, entry.name),
      name: entry.name,
      kind: entry.officialFanZone ? "fan_zone" : (entry.kind ?? "bar"),
      geo: entry.geo,
      geohash: geohash(entry.geo),
      city: city.name,
      country: city.country,
      website: entry.url,
      supportsTeams: teams,
      showsMatches: confidence,
      sources: [source],
    });
    added++;
  }

  log.info("supporters: overlay applied", {
    city: city.slug,
    seedCount: seed.venues.length,
    matched,
    added,
  });
  return { venues, stats: { seedCount: seed.venues.length, matched, added } };
}
