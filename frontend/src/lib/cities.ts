/**
 * City centers for the map default view — mirrors ingestion/src/config/cities.ts
 * (center = midpoint of each city's bbox). Used when the user hasn't shared
 * precise geolocation.
 */
export interface CityOption {
  slug: string;
  name: string;
  center: { lat: number; lon: number };
}

export const CITIES: CityOption[] = [
  { slug: "jersey-city", name: "Jersey City", center: { lat: 40.73, lon: -74.055 } },
  { slug: "new-york", name: "New York", center: { lat: 40.76, lon: -73.96 } },
  { slug: "london", name: "London", center: { lat: 51.515, lon: -0.115 } },
];

export function cityBySlug(slug: string): CityOption | undefined {
  return CITIES.find((c) => c.slug === slug);
}
