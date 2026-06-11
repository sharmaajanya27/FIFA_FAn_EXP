/**
 * Geocode (pipeline stage 3): ensure every venue has a valid geo point.
 *
 * OSM records already carry coordinates, so this stage is mostly validation +
 * a seam for future sources (e.g. event listings with only a street address)
 * that will need a real geocoding API call here. Venues without a resolvable
 * point are dropped — they can't participate in radius search.
 */
import type { Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";

export function geocode(venues: Venue[]): Venue[] {
  const out = venues.filter((v) => {
    const ok =
      Number.isFinite(v.geo.lat) &&
      Number.isFinite(v.geo.lon) &&
      !(v.geo.lat === 0 && v.geo.lon === 0); // null-island guard
    if (!ok) {
      log.warn("geocode: dropped venue with no usable point", { id: v.id });
    }
    return ok;
  });
  log.info("geocode: validated points", { in: venues.length, out: out.length });
  return out;
}
