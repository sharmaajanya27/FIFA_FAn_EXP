/**
 * City centers for the map default view — mirrors the API /metros catalog
 * (ingestion cities + i18n metadata). Used when the user hasn't shared precise
 * geolocation.
 */
export interface CityOption {
  slug: string;
  name: string;
  country: string;
  center: { lat: number; lon: number };
  /** Match stadium — selectable as a search origin (downtown center is default). */
  stadium?: CityAnchor;
}

/** A named search-origin option within a city. */
export interface CityAnchor {
  name: string;
  center: { lat: number; lon: number };
}

export const CITIES: CityOption[] = [
  {
    slug: "jersey-city",
    name: "Jersey City",
    country: "🇺🇸",
    center: { lat: 40.73, lon: -74.055 },
    stadium: {
      name: "MetLife Stadium",
      center: { lat: 40.8135, lon: -74.0745 },
    },
  },
  {
    slug: "new-york",
    name: "New York",
    country: "🇺🇸",
    center: { lat: 40.76, lon: -73.96 },
    stadium: {
      name: "MetLife Stadium",
      center: { lat: 40.8135, lon: -74.0745 },
    },
  },
  {
    slug: "london",
    name: "London",
    country: "🇬🇧",
    center: { lat: 51.515, lon: -0.115 },
    stadium: { name: "Wembley Stadium", center: { lat: 51.556, lon: -0.2796 } },
  },
  {
    slug: "buenos-aires",
    name: "Buenos Aires",
    country: "🇦🇷",
    center: { lat: -34.6, lon: -58.4 },
    stadium: {
      name: "Estadio Monumental",
      center: { lat: -34.5453, lon: -58.4498 },
    },
  },
  {
    slug: "sao-paulo",
    name: "São Paulo",
    country: "🇧🇷",
    center: { lat: -23.55, lon: -46.64 },
    stadium: {
      name: "Estádio do Morumbi",
      center: { lat: -23.6, lon: -46.7211 },
    },
  },
  {
    slug: "madrid",
    name: "Madrid",
    country: "🇪🇸",
    center: { lat: 40.42, lon: -3.7 },
    stadium: {
      name: "Santiago Bernabéu",
      center: { lat: 40.4531, lon: -3.6883 },
    },
  },
  {
    slug: "mexico-city",
    name: "Mexico City",
    country: "🇲🇽",
    center: { lat: 19.43, lon: -99.13 },
    stadium: { name: "Estadio Azteca", center: { lat: 19.303, lon: -99.1505 } },
  },
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "🇯🇵",
    center: { lat: 35.68, lon: 139.74 },
    stadium: {
      name: "Japan National Stadium",
      center: { lat: 35.6779, lon: 139.7147 },
    },
  },
  // FIFA World Cup 2026 host cities.
  {
    slug: "atlanta",
    name: "Atlanta",
    country: "🇺🇸",
    center: { lat: 33.755, lon: -84.39 },
    stadium: {
      name: "Mercedes-Benz Stadium",
      center: { lat: 33.7553, lon: -84.4006 },
    },
  },
  {
    slug: "boston",
    name: "Boston",
    country: "🇺🇸",
    center: { lat: 42.36, lon: -71.06 },
    stadium: {
      name: "Gillette Stadium (Foxborough)",
      center: { lat: 42.0909, lon: -71.2643 },
    },
  },
  {
    slug: "dallas",
    name: "Dallas",
    country: "🇺🇸",
    center: { lat: 32.78, lon: -96.8 },
    stadium: {
      name: "AT&T Stadium (Arlington)",
      center: { lat: 32.7473, lon: -97.0945 },
    },
  },
  {
    slug: "houston",
    name: "Houston",
    country: "🇺🇸",
    center: { lat: 29.76, lon: -95.37 },
    stadium: { name: "NRG Stadium", center: { lat: 29.6847, lon: -95.4107 } },
  },
  {
    slug: "kansas-city",
    name: "Kansas City",
    country: "🇺🇸",
    center: { lat: 39.1, lon: -94.58 },
    stadium: {
      name: "Arrowhead Stadium",
      center: { lat: 39.0489, lon: -94.4839 },
    },
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    country: "🇺🇸",
    center: { lat: 34.05, lon: -118.24 },
    stadium: {
      name: "SoFi Stadium (Inglewood)",
      center: { lat: 33.9535, lon: -118.3392 },
    },
  },
  {
    slug: "miami",
    name: "Miami",
    country: "🇺🇸",
    center: { lat: 25.77, lon: -80.19 },
    stadium: {
      name: "Hard Rock Stadium (Miami Gardens)",
      center: { lat: 25.958, lon: -80.2389 },
    },
  },
  {
    slug: "philadelphia",
    name: "Philadelphia",
    country: "🇺🇸",
    center: { lat: 39.95, lon: -75.16 },
    stadium: {
      name: "Lincoln Financial Field",
      center: { lat: 39.9008, lon: -75.1675 },
    },
  },
  {
    slug: "san-francisco",
    name: "San Francisco Bay Area",
    country: "🇺🇸",
    center: { lat: 37.77, lon: -122.42 },
    stadium: {
      name: "Levi's Stadium (Santa Clara)",
      center: { lat: 37.403, lon: -121.9698 },
    },
  },
  {
    slug: "seattle",
    name: "Seattle",
    country: "🇺🇸",
    center: { lat: 47.61, lon: -122.33 },
    stadium: { name: "Lumen Field", center: { lat: 47.5952, lon: -122.3316 } },
  },
  {
    slug: "toronto",
    name: "Toronto",
    country: "🇨🇦",
    center: { lat: 43.65, lon: -79.38 },
    stadium: { name: "BMO Field", center: { lat: 43.6332, lon: -79.4185 } },
  },
  {
    slug: "vancouver",
    name: "Vancouver",
    country: "🇨🇦",
    center: { lat: 49.28, lon: -123.12 },
    stadium: { name: "BC Place", center: { lat: 49.2768, lon: -123.1119 } },
  },
  {
    slug: "guadalajara",
    name: "Guadalajara",
    country: "🇲🇽",
    center: { lat: 20.67, lon: -103.35 },
    stadium: {
      name: "Estadio Akron",
      center: { lat: 20.6819, lon: -103.4625 },
    },
  },
  {
    slug: "monterrey",
    name: "Monterrey",
    country: "🇲🇽",
    center: { lat: 25.69, lon: -100.32 },
    stadium: { name: "Estadio BBVA", center: { lat: 25.6692, lon: -100.2444 } },
  },
];

export function cityBySlug(slug: string): CityOption | undefined {
  return CITIES.find((c) => c.slug === slug);
}
