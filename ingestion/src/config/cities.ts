/**
 * Supported cities/metros for Phase 0 ingestion.
 *
 * Each city carries a bounding box (south, west, north, east) used to query
 * sources like Overpass. Adding a new city is config-only — no code changes —
 * per the "pluggable sources / new cities without rearchitecting" requirement
 * (PRD §5.4).
 */
export interface City {
  /** Stable slug used in filenames and CLI args, e.g. "jersey-city". */
  slug: string;
  name: string;
  country: string;
  /** Bounding box: [south, west, north, east] in WGS84 degrees. */
  bbox: [number, number, number, number];
}

export const CITIES: Record<string, City> = {
  "jersey-city": {
    slug: "jersey-city",
    name: "Jersey City",
    country: "US",
    bbox: [40.68, -74.11, 40.78, -74.0],
  },
  "new-york": {
    slug: "new-york",
    name: "New York",
    country: "US",
    bbox: [40.7, -74.02, 40.82, -73.9],
  },
  london: {
    slug: "london",
    name: "London",
    country: "GB",
    bbox: [51.48, -0.18, 51.55, -0.05],
  },
};

export function getCity(slug: string): City {
  const city = CITIES[slug];
  if (!city) {
    const known = Object.keys(CITIES).join(", ");
    throw new Error(`Unknown city "${slug}". Known cities: ${known}`);
  }
  return city;
}
