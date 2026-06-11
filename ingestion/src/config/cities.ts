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
  // International expansion (Phase 3) — adding a metro is config-only.
  "buenos-aires": {
    slug: "buenos-aires",
    name: "Buenos Aires",
    country: "AR",
    bbox: [-34.64, -58.45, -34.56, -58.36],
  },
  "sao-paulo": {
    slug: "sao-paulo",
    name: "São Paulo",
    country: "BR",
    bbox: [-23.59, -46.69, -23.52, -46.6],
  },
  madrid: {
    slug: "madrid",
    name: "Madrid",
    country: "ES",
    bbox: [40.38, -3.74, 40.46, -3.65],
  },
  "mexico-city": {
    slug: "mexico-city",
    name: "Mexico City",
    country: "MX",
    bbox: [19.39, -99.18, 19.46, -99.12],
  },
  tokyo: {
    slug: "tokyo",
    name: "Tokyo",
    country: "JP",
    bbox: [35.65, 139.69, 35.72, 139.78],
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
