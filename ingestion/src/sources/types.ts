/**
 * Source connector contract. Every source (OSM, Google Places, event sites,
 * social, schedules) implements this so the pipeline can add new sources
 * without rearchitecting (PRD §5.4).
 */
import type { City } from "../config/cities.js";
import type { Source } from "../models/canonical.js";

/**
 * A raw, source-shaped record straight from "Collect" — intentionally untyped
 * payload. Normalization (the next stage) maps `payload` into the canonical
 * model. `source` carries provenance so dedup/freshness work downstream.
 */
export interface RawRecord {
  source: Source;
  payload: Record<string, unknown>;
}

export interface SourceConnector {
  /** Stable id, e.g. "osm-overpass". */
  readonly id: string;
  /** Collect raw venue records for a city. */
  collectVenues(city: City): Promise<RawRecord[]>;
}
