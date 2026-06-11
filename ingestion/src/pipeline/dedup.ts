/**
 * Deduplicate & match (pipeline stage 4): merge records that describe the same
 * physical venue across sources.
 *
 * Strategy: bucket by geohash prefix (cheap spatial pre-filter), then within a
 * bucket treat two venues as the same if they are within DUP_RADIUS_M meters
 * and have similar names. Merged venues accumulate provenance in `sources`,
 * which is what makes cross-source freshness/coverage tracking possible.
 */
import type { Venue } from "../models/canonical.js";
import { haversineMeters } from "../util/geo.js";
import { log } from "../util/logger.js";

const DUP_RADIUS_M = 60;
/** Compare on a 5-char geohash prefix (~5km cell) to catch near-neighbors. */
const BUCKET_PRECISION = 5;

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

function mergeInto(target: Venue, dup: Venue): void {
  // Keep the richer record's scalar fields; union provenance + team support.
  target.address ??= dup.address;
  target.phone ??= dup.phone;
  target.website ??= dup.website;
  target.hours ??= dup.hours;
  target.ratingAvg ??= dup.ratingAvg;
  target.capacity ??= dup.capacity;
  target.supportsTeams = Array.from(
    new Set([...target.supportsTeams, ...dup.supportsTeams]),
  );
  const seen = new Set(target.sources.map((s) => `${s.name}:${s.externalId}`));
  for (const s of dup.sources) {
    const key = `${s.name}:${s.externalId}`;
    if (!seen.has(key)) {
      target.sources.push(s);
      seen.add(key);
    }
  }
}

export function dedup(venues: Venue[]): Venue[] {
  const buckets = new Map<string, Venue[]>();

  for (const v of venues) {
    const key = v.geohash.slice(0, BUCKET_PRECISION);
    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, [v]);
      continue;
    }
    const match = bucket.find(
      (existing) =>
        haversineMeters(existing.geo, v.geo) <= DUP_RADIUS_M &&
        nameSimilarity(existing.name, v.name) >= 0.5,
    );
    if (match) {
      mergeInto(match, v);
    } else {
      bucket.push(v);
    }
  }

  const out = [...buckets.values()].flat();
  const removed = venues.length - out.length;
  log.info("dedup: merged duplicates", {
    in: venues.length,
    out: out.length,
    merged: removed,
  });
  return out;
}
