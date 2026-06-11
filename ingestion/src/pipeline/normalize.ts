/**
 * Normalize (pipeline stage 2): map raw source records into canonical Venues.
 *
 * This is OSM-aware mapping today; when more sources land, each gets its own
 * normalizer but they all emit the same canonical `Venue`.
 */
import { createHash } from "node:crypto";
import type { City } from "../config/cities.js";
import { TEAM_BY_CODE, matchTeamCode } from "../config/teams.js";
import {
  type Event,
  EventSchema,
  type Match,
  MatchSchema,
  type Venue,
  type VenueKind,
  VenueSchema,
} from "../models/canonical.js";
import type { RawRecord } from "../sources/types.js";
import { geohash } from "../util/geo.js";
import { log } from "../util/logger.js";

/** Deterministic FanWatch id from provenance, so re-runs are idempotent. */
function venueId(sourceName: string, externalId: string): string {
  return createHash("sha1")
    .update(`${sourceName}:${externalId}`)
    .digest("hex")
    .slice(0, 16);
}

function mapKind(amenity: string | undefined): VenueKind {
  switch (amenity) {
    case "bar":
      return "bar";
    case "pub":
      return "pub";
    case "restaurant":
      return "restaurant";
    case "cafe":
      return "cafe";
    default:
      return "other";
  }
}

/** Known sports-bar chains — strong "shows matches" signal when OSM has a brand. */
const SPORTS_BAR_BRANDS = [
  "buffalo wild wings",
  "hooters",
  "twin peaks",
  "dave & buster",
  "yard house",
  "the greene turtle",
  "miller's ale house",
  "walk-on's",
];
const MATCH_KEYWORDS =
  /\b(sports?|football|soccer|f[uú]tbol|futebol|supporters?|fans?|tavern|ale\s?house|brewhouse|gastropub|sports bar)\b/i;

/**
 * Heuristic 0..1 confidence that a venue shows live matches / hosts fans,
 * derived from OSM tags. Separates a sports bar from a quiet cafe. Richer
 * sources (Places categories, reviews, social) raise confidence when they land.
 */
function computeShowsMatches(
  tags: Record<string, string>,
  kind: VenueKind,
): number {
  let score = 0;
  const sport = (tags.sport ?? "").toLowerCase();
  if (/soccer|football|multi/.test(sport)) score += 0.5;
  const tv = (tags.tv ?? "").toLowerCase();
  if (tv && tv !== "no") score += 0.3;
  if (kind === "pub") score += 0.25;
  else if (kind === "bar") score += 0.15;
  const text = `${tags.name ?? ""} ${tags.description ?? ""} ${tags.brand ?? ""}`;
  if (MATCH_KEYWORDS.test(text)) score += 0.3;
  const brand = (tags.brand ?? "").toLowerCase();
  if (SPORTS_BAR_BRANDS.some((b) => brand.includes(b))) score += 0.4;
  return Math.max(0, Math.min(1, score));
}

/** Assemble an OSM address string from addr:* tags, if present. */
function osmAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter((p) => p && p.length > 0);
  return parts.length ? parts.join(", ") : undefined;
}

export function normalizeOsmRecord(rec: RawRecord, city: City): Venue | null {
  const payload = rec.payload as {
    lat: number;
    lon: number;
    tags: Record<string, string>;
  };
  const tags = payload.tags ?? {};
  const name = tags.name;
  if (!name) return null;

  const geo = { lat: payload.lat, lon: payload.lon };
  const kind = mapKind(tags.amenity);

  const candidate: Venue = {
    id: venueId(rec.source.name, rec.source.externalId),
    name,
    kind,
    geo,
    geohash: geohash(geo),
    address: osmAddress(tags),
    city: tags["addr:city"] ?? city.name,
    country: city.country,
    phone: tags.phone ?? tags["contact:phone"],
    website: safeUrl(tags.website ?? tags["contact:website"]),
    hours: tags.opening_hours,
    showsMatches: computeShowsMatches(tags, kind),
    supportsTeams: [],
    sources: [rec.source],
  };

  const parsed = VenueSchema.safeParse(candidate);
  if (!parsed.success) {
    log.warn("normalize: dropped invalid venue", {
      externalId: rec.source.externalId,
      issues: parsed.error.issues.map((i) => i.path.join(".")),
    });
    return null;
  }
  return parsed.data;
}

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    new URL(value);
    return value;
  } catch {
    return undefined;
  }
}

export function normalizeOsm(records: RawRecord[], city: City): Venue[] {
  const out: Venue[] = [];
  for (const rec of records) {
    const v = normalizeOsmRecord(rec, city);
    if (v) out.push(v);
  }
  log.info("normalize: produced canonical venues", {
    city: city.slug,
    in: records.length,
    out: out.length,
  });
  return out;
}

/** Normalize raw fixture records into canonical Matches. */
export function normalizeMatches(records: RawRecord[]): Match[] {
  const out: Match[] = [];
  for (const rec of records) {
    const p = rec.payload as {
      competition: string;
      homeTeam: string;
      awayTeam: string;
      kickoff: string;
      stage?: string;
    };
    if (!TEAM_BY_CODE[p.homeTeam] || !TEAM_BY_CODE[p.awayTeam]) {
      log.warn("normalize: unknown team code in fixture", {
        externalId: rec.source.externalId,
        home: p.homeTeam,
        away: p.awayTeam,
      });
      continue;
    }
    const candidate: Match = {
      id: venueId(rec.source.name, rec.source.externalId),
      competition: p.competition,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      kickoff: p.kickoff,
      stage: p.stage,
      sources: [rec.source],
    };
    const parsed = MatchSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
    else
      log.warn("normalize: dropped invalid match", {
        externalId: rec.source.externalId,
      });
  }
  log.info("normalize: produced canonical matches", {
    in: records.length,
    out: out.length,
  });
  return out;
}

/** Normalize raw event records into canonical Events. */
export function normalizeEvents(records: RawRecord[], city: City): Event[] {
  const out: Event[] = [];
  for (const rec of records) {
    const p = rec.payload as {
      title: string;
      kind?: Event["kind"];
      lat: number;
      lon: number;
      startTime: string;
      venueId?: string;
      matchId?: string;
      teams?: string[];
      estAttendance?: number;
    };
    if (!p.title || p.lat === undefined || p.lon === undefined) continue;
    const geo = { lat: p.lat, lon: p.lon };
    // Infer team affiliation from the title when not explicitly provided.
    const inferred = matchTeamCode(p.title);
    const teams = p.teams?.length ? p.teams : inferred ? [inferred] : [];
    const candidate: Event = {
      id: venueId(rec.source.name, rec.source.externalId),
      title: p.title,
      kind: p.kind ?? "viewing_party",
      geo,
      geohash: geohash(geo),
      startTime: p.startTime,
      city: city.name,
      country: city.country,
      venueId: p.venueId,
      matchId: p.matchId,
      teams,
      estAttendance: p.estAttendance,
      sources: [rec.source],
    };
    const parsed = EventSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
    else
      log.warn("normalize: dropped invalid event", {
        externalId: rec.source.externalId,
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      });
  }
  log.info("normalize: produced canonical events", {
    city: city.slug,
    in: records.length,
    out: out.length,
  });
  return out;
}
