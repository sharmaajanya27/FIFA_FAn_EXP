/** Geo helpers: haversine distance and geohash encoding. */
import type { GeoPoint } from "../models/canonical.js";

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encode a point to a geohash string. Precision 7 ≈ 153m × 153m cells — good
 * for coarse spatial bucketing, cheap dedup pre-filtering, and DynamoDB
 * partitioning if we go that route later.
 */
export function geohash(point: GeoPoint, precision = 7): string {
  let latRange: [number, number] = [-90, 90];
  let lonRange: [number, number] = [-180, 180];
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (point.lon >= mid) {
        ch = (ch << 1) | 1;
        lonRange = [mid, lonRange[1]];
      } else {
        ch = ch << 1;
        lonRange = [lonRange[0], mid];
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (point.lat >= mid) {
        ch = (ch << 1) | 1;
        latRange = [mid, latRange[1]];
      } else {
        ch = ch << 1;
        latRange = [latRange[0], mid];
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}
