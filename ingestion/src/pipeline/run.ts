/**
 * Pipeline orchestrator: Collect → Normalize → Geocode → Dedup → Publish.
 *
 * (Enrich and Score are later stages — see PRD §5.3. The seams are here; the
 * implementations land as enrichment sources come online.)
 */
import type { City } from "../config/cities.js";
import type { Env } from "../config/env.js";
import type { Venue } from "../models/canonical.js";
import { OverpassConnector } from "../sources/osm/overpass.js";
import type { Publisher } from "../publishers/types.js";
import { log } from "../util/logger.js";
import { normalizeOsm } from "./normalize.js";
import { geocode } from "./geocode.js";
import { dedup } from "./dedup.js";

export interface PipelineResult {
  city: string;
  collected: number;
  published: number;
  venues: Venue[];
}

export async function runPipeline(
  city: City,
  env: Env,
  publishers: Publisher[],
): Promise<PipelineResult> {
  log.info("pipeline: start", { city: city.slug });

  // 1. Collect
  const connector = new OverpassConnector(env);
  const raw = await connector.collectVenues(city);

  // 2. Normalize
  const normalized = normalizeOsm(raw, city);

  // 3. Geocode (validate points)
  const geocoded = geocode(normalized);

  // 4. Deduplicate & match
  const deduped = dedup(geocoded);

  // 5. Publish (JSONL source of truth + Excel report)
  for (const publisher of publishers) {
    await publisher.publishVenues(deduped, { citySlug: city.slug });
  }

  log.info("pipeline: done", {
    city: city.slug,
    collected: raw.length,
    published: deduped.length,
  });

  return {
    city: city.slug,
    collected: raw.length,
    published: deduped.length,
    venues: deduped,
  };
}
