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
}

export const CITIES: CityOption[] = [
  { slug: "jersey-city", name: "Jersey City", country: "🇺🇸", center: { lat: 40.73, lon: -74.055 } },
  { slug: "new-york", name: "New York", country: "🇺🇸", center: { lat: 40.76, lon: -73.96 } },
  { slug: "london", name: "London", country: "🇬🇧", center: { lat: 51.515, lon: -0.115 } },
  { slug: "buenos-aires", name: "Buenos Aires", country: "🇦🇷", center: { lat: -34.6, lon: -58.4 } },
  { slug: "sao-paulo", name: "São Paulo", country: "🇧🇷", center: { lat: -23.55, lon: -46.64 } },
  { slug: "madrid", name: "Madrid", country: "🇪🇸", center: { lat: 40.42, lon: -3.7 } },
  { slug: "mexico-city", name: "Mexico City", country: "🇲🇽", center: { lat: 19.43, lon: -99.13 } },
  { slug: "tokyo", name: "Tokyo", country: "🇯🇵", center: { lat: 35.68, lon: 139.74 } },
];

export function cityBySlug(slug: string): CityOption | undefined {
  return CITIES.find((c) => c.slug === slug);
}
