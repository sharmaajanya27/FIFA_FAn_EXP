/**
 * Data-quality monitoring (PRD §5.4): compute freshness/coverage/dedup metrics
 * for a pipeline run so we can track ingestion health per city over time.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";

export interface QualityReport {
  city: string;
  generatedAt: string;
  venues: {
    collected: number;
    published: number;
    dedupMergedPct: number;
    geocodeSuccessPct: number;
    withAddressPct: number;
    withTeamPct: number;
    scoredPct: number;
  };
  matches: { count: number };
  events: { count: number; linkedToMatchPct: number };
}

const pct = (n: number, d: number) =>
  d === 0 ? 0 : Math.round((n / d) * 1000) / 10;

export function buildQualityReport(input: {
  city: string;
  collectedVenues: number;
  venues: Venue[];
  matches: Match[];
  events: Event[];
}): QualityReport {
  const { venues, matches, events } = input;
  const published = venues.length;
  return {
    city: input.city,
    generatedAt: new Date().toISOString(),
    venues: {
      collected: input.collectedVenues,
      published,
      dedupMergedPct: pct(input.collectedVenues - published, input.collectedVenues),
      geocodeSuccessPct: pct(
        venues.filter((v) => Number.isFinite(v.geo.lat)).length,
        published,
      ),
      withAddressPct: pct(venues.filter((v) => v.address).length, published),
      withTeamPct: pct(
        venues.filter((v) => v.supportsTeams.length > 0).length,
        published,
      ),
      scoredPct: pct(venues.filter((v) => v.score !== undefined).length, published),
    },
    matches: { count: matches.length },
    events: {
      count: events.length,
      linkedToMatchPct: pct(events.filter((e) => e.matchId).length, events.length),
    },
  };
}

export async function writeQualityReport(
  dataDir: string,
  report: QualityReport,
): Promise<void> {
  const dir = resolve(dataDir, report.city);
  await mkdir(dir, { recursive: true });
  const file = join(dir, "quality.json");
  await writeFile(file, JSON.stringify(report, null, 2), "utf8");
  log.info("quality: wrote report", {
    file,
    geocode: report.venues.geocodeSuccessPct,
    withTeam: report.venues.withTeamPct,
    events: report.events.count,
  });
}
