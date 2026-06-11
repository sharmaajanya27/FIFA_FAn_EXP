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
  /**
   * The match stadium. `center` is a search-origin option in the UI. `bbox` is
   * an optional dedicated scrape area used only when the stadium falls outside
   * the downtown `bbox` (e.g. suburban stadiums like Levi's / Gillette) so we
   * still ingest venues around it. Overlaps with the downtown scrape are merged
   * by the dedup stage.
   */
  stadium?: CityAnchor;
}

/** A named point of interest within a city used as a search origin / scrape area. */
export interface CityAnchor {
  name: string;
  center: { lat: number; lon: number };
  /** Optional dedicated scrape bbox [south, west, north, east] around the anchor. */
  bbox?: [number, number, number, number];
}

/** All bounding boxes to scrape for a city: downtown plus any anchor bboxes. */
export function scrapeBboxes(city: City): [number, number, number, number][] {
  const boxes: [number, number, number, number][] = [city.bbox];
  if (city.stadium?.bbox) boxes.push(city.stadium.bbox);
  return boxes;
}

export const CITIES: Record<string, City> = {
  "jersey-city": {
    slug: "jersey-city",
    name: "Jersey City",
    country: "US",
    bbox: [40.68, -74.11, 40.78, -74.0],
    stadium: {
      name: "MetLife Stadium",
      center: { lat: 40.8135, lon: -74.0745 },
      bbox: [40.79, -74.1, 40.84, -74.05],
    },
  },
  "new-york": {
    slug: "new-york",
    name: "New York",
    country: "US",
    bbox: [40.7, -74.02, 40.82, -73.9],
    stadium: {
      name: "MetLife Stadium",
      center: { lat: 40.8135, lon: -74.0745 },
      bbox: [40.79, -74.1, 40.84, -74.05],
    },
  },
  london: {
    slug: "london",
    name: "London",
    country: "GB",
    bbox: [51.48, -0.18, 51.55, -0.05],
    stadium: {
      name: "Wembley Stadium",
      center: { lat: 51.556, lon: -0.2796 },
      bbox: [51.54, -0.3, 51.57, -0.26],
    },
  },
  // International expansion (Phase 3) — adding a metro is config-only.
  "buenos-aires": {
    slug: "buenos-aires",
    name: "Buenos Aires",
    country: "AR",
    bbox: [-34.64, -58.45, -34.56, -58.36],
    stadium: {
      name: "Estadio Monumental",
      center: { lat: -34.5453, lon: -58.4498 },
      bbox: [-34.56, -58.47, -34.53, -58.43],
    },
  },
  "sao-paulo": {
    slug: "sao-paulo",
    name: "São Paulo",
    country: "BR",
    bbox: [-23.59, -46.69, -23.52, -46.6],
    stadium: {
      name: "Estádio do Morumbi",
      center: { lat: -23.6, lon: -46.7211 },
      bbox: [-23.62, -46.74, -23.58, -46.7],
    },
  },
  madrid: {
    slug: "madrid",
    name: "Madrid",
    country: "ES",
    bbox: [40.38, -3.74, 40.46, -3.65],
    stadium: {
      name: "Santiago Bernabéu",
      center: { lat: 40.4531, lon: -3.6883 },
    },
  },
  "mexico-city": {
    slug: "mexico-city",
    name: "Mexico City",
    country: "MX",
    bbox: [19.39, -99.18, 19.46, -99.12],
    stadium: {
      name: "Estadio Azteca",
      center: { lat: 19.303, lon: -99.1505 },
      bbox: [19.28, -99.17, 19.32, -99.13],
    },
  },
  tokyo: {
    slug: "tokyo",
    name: "Tokyo",
    country: "JP",
    bbox: [35.65, 139.69, 35.72, 139.78],
    stadium: {
      name: "Japan National Stadium",
      center: { lat: 35.6779, lon: 139.7147 },
    },
  },
  // FIFA World Cup 2026 host cities. New York/New Jersey is covered by the
  // "new-york" + "jersey-city" metros above, and Mexico City already exists.
  atlanta: {
    slug: "atlanta",
    name: "Atlanta",
    country: "US",
    bbox: [33.7, -84.45, 33.82, -84.34],
    stadium: {
      name: "Mercedes-Benz Stadium",
      center: { lat: 33.7553, lon: -84.4006 },
    },
  },
  boston: {
    slug: "boston",
    name: "Boston",
    country: "US",
    bbox: [42.32, -71.12, 42.4, -71.0],
    stadium: {
      name: "Gillette Stadium (Foxborough)",
      center: { lat: 42.0909, lon: -71.2643 },
      bbox: [42.07, -71.29, 42.11, -71.24],
    },
  },
  dallas: {
    slug: "dallas",
    name: "Dallas",
    country: "US",
    bbox: [32.72, -96.86, 32.85, -96.74],
    stadium: {
      name: "AT&T Stadium (Arlington)",
      center: { lat: 32.7473, lon: -97.0945 },
      bbox: [32.73, -97.12, 32.77, -97.07],
    },
  },
  houston: {
    slug: "houston",
    name: "Houston",
    country: "US",
    bbox: [29.7, -95.43, 29.82, -95.31],
    stadium: {
      name: "NRG Stadium",
      center: { lat: 29.6847, lon: -95.4107 },
      bbox: [29.67, -95.43, 29.7, -95.39],
    },
  },
  "kansas-city": {
    slug: "kansas-city",
    name: "Kansas City",
    country: "US",
    bbox: [39.04, -94.65, 39.16, -94.51],
    stadium: {
      name: "Arrowhead Stadium",
      center: { lat: 39.0489, lon: -94.4839 },
      bbox: [39.03, -94.5, 39.07, -94.46],
    },
  },
  "los-angeles": {
    slug: "los-angeles",
    name: "Los Angeles",
    country: "US",
    bbox: [33.99, -118.32, 34.1, -118.16],
    stadium: {
      name: "SoFi Stadium (Inglewood)",
      center: { lat: 33.9535, lon: -118.3392 },
      bbox: [33.93, -118.36, 33.97, -118.32],
    },
  },
  miami: {
    slug: "miami",
    name: "Miami",
    country: "US",
    bbox: [25.71, -80.26, 25.83, -80.13],
    stadium: {
      name: "Hard Rock Stadium (Miami Gardens)",
      center: { lat: 25.958, lon: -80.2389 },
      bbox: [25.94, -80.26, 25.98, -80.22],
    },
  },
  philadelphia: {
    slug: "philadelphia",
    name: "Philadelphia",
    country: "US",
    bbox: [39.9, -75.23, 40.0, -75.1],
    stadium: {
      name: "Lincoln Financial Field",
      center: { lat: 39.9008, lon: -75.1675 },
    },
  },
  "san-francisco": {
    slug: "san-francisco",
    name: "San Francisco Bay Area",
    country: "US",
    bbox: [37.72, -122.48, 37.81, -122.38],
    stadium: {
      name: "Levi's Stadium (Santa Clara)",
      center: { lat: 37.403, lon: -121.9698 },
      bbox: [37.39, -121.99, 37.42, -121.95],
    },
  },
  seattle: {
    slug: "seattle",
    name: "Seattle",
    country: "US",
    bbox: [47.56, -122.4, 47.66, -122.28],
    stadium: { name: "Lumen Field", center: { lat: 47.5952, lon: -122.3316 } },
  },
  toronto: {
    slug: "toronto",
    name: "Toronto",
    country: "CA",
    bbox: [43.62, -79.43, 43.7, -79.33],
    stadium: { name: "BMO Field", center: { lat: 43.6332, lon: -79.4185 } },
  },
  vancouver: {
    slug: "vancouver",
    name: "Vancouver",
    country: "CA",
    bbox: [49.24, -123.18, 49.31, -123.06],
    stadium: { name: "BC Place", center: { lat: 49.2768, lon: -123.1119 } },
  },
  guadalajara: {
    slug: "guadalajara",
    name: "Guadalajara",
    country: "MX",
    bbox: [20.62, -103.41, 20.72, -103.29],
    stadium: {
      name: "Estadio Akron",
      center: { lat: 20.6819, lon: -103.4625 },
      bbox: [20.66, -103.48, 20.7, -103.44],
    },
  },
  monterrey: {
    slug: "monterrey",
    name: "Monterrey",
    country: "MX",
    bbox: [25.63, -100.38, 25.74, -100.26],
    stadium: {
      name: "Estadio BBVA",
      center: { lat: 25.6692, lon: -100.2444 },
      bbox: [25.65, -100.26, 25.69, -100.22],
    },
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
