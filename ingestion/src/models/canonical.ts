/**
 * Canonical FanMatch data model (Phase 0).
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
  /** Stable FanMatch id (deterministic hash of source + externalId). */
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
  /** Provenance — one entry per source that contributed to this record. */
  sources: z.array(SourceSchema).min(1),
});
export type Venue = z.infer<typeof VenueSchema>;

export const VenueArraySchema = z.array(VenueSchema);
