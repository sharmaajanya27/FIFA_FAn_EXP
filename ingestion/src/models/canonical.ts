/**
 * Canonical FanWatch data model (Phase 0).
 *
 * Every source connector normalizes its raw records into these shapes, so the
 * rest of the platform (discovery, ranking, recommendations) reads one schema
 * regardless of where the data came from. Mirrors the ER diagram in
 * WORKFLOW.md §6 and is competition-agnostic so the World Cup launch and later
 * leagues share the same model.
 */
import { z } from "zod";

/** A WGS84 geographic point. */
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

/** Provenance for every scraped record — required for dedup & freshness. */
export const SourceSchema = z.object({
  /** Connector id, e.g. "osm-overpass". */
  name: z.string(),
  /** Broad category of the source. */
  type: z.enum(["maps", "events", "social", "schedule", "community"]),
  /** ISO timestamp of when this record was scraped. */
  scrapedAt: z.string().datetime(),
  /** The source's own id for this record (e.g. OSM "node/12345"). */
  externalId: z.string(),
  /** Best-effort link back to the source record, if any. */
  url: z.string().url().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const VenueKind = z.enum([
  "bar",
  "pub",
  "restaurant",
  "cafe",
  "fan_zone",
  "other",
]);
export type VenueKind = z.infer<typeof VenueKind>;

/** A place where matches can be watched. */
export const VenueSchema = z.object({
  /** Stable FanWatch id (deterministic hash of source + externalId). */
  id: z.string(),
  name: z.string().min(1),
  kind: VenueKind,
  geo: GeoPointSchema,
  /** Geohash (precision 7 ≈ 150m cell) for coarse bucketing / dedup / DynamoDB. */
  geohash: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  /** Free-form opening hours string as provided by the source. */
  hours: z.string().optional(),
  /** 0..5 average rating once enrichment attaches it. */
  ratingAvg: z.number().min(0).max(5).optional(),
  capacity: z.number().int().positive().optional(),
  /** Country/team codes this venue is known to support (enrichment). */
  supportsTeams: z.array(z.string()).default([]),
  /**
   * Engagement signal (e.g. social mentions) once enrichment attaches it.
   * Placeholder until a social connector lands; feeds the Score stage.
   */
  engagement: z.number().min(0).optional(),
  /**
   * Precomputed static ranking score (0..1). Combines source-side signals
   * (rating, capacity, engagement). Query-time signals — distance and
   * team-fan-match — are applied at discovery time in Phase 1 (PRD §6.5).
   */
  score: z.number().min(0).max(1).optional(),
  /**
   * Heuristic 0..1 confidence that this venue actually shows live matches /
   * hosts fans (derived from OSM tags in normalize). This is the signal that
   * separates a sports bar from a quiet cafe; it feeds the Score stage.
   */
  showsMatches: z.number().min(0).max(1).default(0),
  /** Provenance — one entry per source that contributed to this record. */
  sources: z.array(SourceSchema).min(1),
});
export type Venue = z.infer<typeof VenueSchema>;

export const VenueArraySchema = z.array(VenueSchema);

/** A national team / club. Country code is FIFA/ISO-style (e.g. "ARG"). */
export const TeamSchema = z.object({
  /** Stable code, e.g. "ARG", "ENG", "USA". */
  code: z.string().min(2),
  name: z.string().min(1),
  country: z.string().min(1),
  /** Lowercased alternate names used for matching in enrichment/normalize. */
  aliases: z.array(z.string()).default([]),
});
export type Team = z.infer<typeof TeamSchema>;

/** A fixture in some competition. Competition-agnostic (WC, EPL, UCL, …). */
export const MatchSchema = z.object({
  id: z.string(),
  /** e.g. "FIFA World Cup 2026", "Premier League". */
  competition: z.string().min(1),
  /** Team codes. */
  homeTeam: z.string().min(2),
  awayTeam: z.string().min(2),
  /** ISO 8601 kickoff timestamp (UTC). */
  kickoff: z.string().datetime(),
  /** Optional stage/round, e.g. "Group A", "Round of 16". */
  stage: z.string().optional(),
  sources: z.array(SourceSchema).min(1),
});
export type Match = z.infer<typeof MatchSchema>;

/** A fan event: viewing party, community watch, official fan zone. */
export const EventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  kind: z.enum(["viewing_party", "fan_zone", "community_watch", "other"]),
  geo: GeoPointSchema,
  geohash: z.string(),
  /** ISO 8601 start time (UTC). */
  startTime: z.string().datetime(),
  city: z.string().optional(),
  country: z.string().optional(),
  /** FanWatch venue id this event is hosted at, if resolved. */
  venueId: z.string().optional(),
  /** FanWatch match id this event shows, if known. */
  matchId: z.string().optional(),
  /** Team codes this event is oriented toward. */
  teams: z.array(z.string()).default([]),
  estAttendance: z.number().int().nonnegative().optional(),
  sources: z.array(SourceSchema).min(1),
});
export type Event = z.infer<typeof EventSchema>;

export const MatchArraySchema = z.array(MatchSchema);
export const EventArraySchema = z.array(EventSchema);
