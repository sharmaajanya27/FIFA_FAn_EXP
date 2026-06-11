/**
 * Pipeline orchestrator: Collect → Normalize → Geocode → Dedup → Enrich →
 * Score → Publish, with data-quality monitoring and manifest tracking
 * (the full Phase 0 pipeline — PRD §5.3).
 *
 * Matches are competition-global, so the CLI collects them once and passes the
 * normalized list in; venues and events are collected per city here.
 */
import type { City } from "../config/cities.js";
import type { Env } from "../config/env.js";
import type { ScoringConfig } from "../config/scoring.js";
import type { Match, Venue, Event } from "../models/canonical.js";
import type { Publisher } from "../publishers/types.js";
import { SeedEventsConnector } from "../sources/events/seedEvents.js";
import { OverpassConnector } from "../sources/osm/overpass.js";
import { log } from "../util/logger.js";
import { dedup } from "./dedup.js";
import { enrichEvents, enrichVenues } from "./enrich.js";
import { geocode } from "./geocode.js";
import {
  normalizeEvents,
  normalizeOsm,
} from "./normalize.js";
import { scoreVenues } from "./score.js";
import { buildQualityReport, writeQualityReport } from "../monitoring/quality.js";
import type { SourceManifest } from "../refresh/manifest.js";

export interface PipelineDeps {
  env: Env;
  publishers: Publisher[];
  matches: Match[];
  scoring: ScoringConfig;
  manifest: SourceManifest;
}

export interface PipelineResult {
  city: string;
  collectedVenues: number;
  venues: Venue[];
  events: Event[];
}

export async function runPipeline(
  city: City,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const { env, publishers, matches, scoring, manifest } = deps;
  log.info("pipeline: start", { city: city.slug });

  // 1. Collect
  const venueConnector = new OverpassConnector(env);
  const eventConnector = new SeedEventsConnector();
  const rawVenues = await venueConnector.collectVenues(city);
  const rawEvents = await eventConnector.collectEvents(city);

  // 2. Normalize
  const normalizedVenues = normalizeOsm(rawVenues, city);
  const events = normalizeEvents(rawEvents, city);

  // 3. Geocode (validate venue points)
  const geocoded = geocode(normalizedVenues);

  // 4. Deduplicate & match
  const deduped = dedup(geocoded);

  // 5. Enrich (team affiliation; link events to matches)
  const enrichedVenues = enrichVenues(deduped);
  const enrichedEvents = enrichEvents(events, matches);

  // 6. Score (static venue score)
  const scoredVenues = scoreVenues(enrichedVenues, scoring);

  // 7. Publish (JSONL source of truth + Excel report)
  const ctx = { citySlug: city.slug };
  for (const publisher of publishers) {
    await publisher.publishVenues(scoredVenues, ctx);
    await publisher.publishMatches(matches, ctx);
    await publisher.publishEvents(enrichedEvents, ctx);
  }

  // 8. Data-quality monitoring
  const report = buildQualityReport({
    city: city.slug,
    collectedVenues: rawVenues.length,
    venues: scoredVenues,
    matches,
    events: enrichedEvents,
  });
  await writeQualityReport(env.dataDir, report);

  // 9. Manifest (incremental-refresh bookkeeping)
  manifest.record(venueConnector.id, city.slug, scoredVenues.length);
  manifest.record(eventConnector.id, city.slug, enrichedEvents.length);

  log.info("pipeline: done", {
    city: city.slug,
    venues: scoredVenues.length,
    matches: matches.length,
    events: enrichedEvents.length,
  });

  return {
    city: city.slug,
    collectedVenues: rawVenues.length,
    venues: scoredVenues,
    events: enrichedEvents,
  };
}
