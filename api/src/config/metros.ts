/**
 * Supported metros with i18n metadata (PRD §11 Phase 3 — international
 * expansion). Mirrors ingestion city slugs and adds the locale/currency seam
 * the UI needs to localize per market. Adding a metro is config-only.
 */
export interface Metro {
  slug: string;
  name: string;
  country: string;
  locale: string;
  currency: string;
  center: { lat: number; lon: number };
}

export const METROS: Metro[] = [
  { slug: "jersey-city", name: "Jersey City", country: "US", locale: "en-US", currency: "USD", center: { lat: 40.73, lon: -74.055 } },
  { slug: "new-york", name: "New York", country: "US", locale: "en-US", currency: "USD", center: { lat: 40.76, lon: -73.96 } },
  { slug: "london", name: "London", country: "GB", locale: "en-GB", currency: "GBP", center: { lat: 51.515, lon: -0.115 } },
  { slug: "buenos-aires", name: "Buenos Aires", country: "AR", locale: "es-AR", currency: "ARS", center: { lat: -34.6, lon: -58.4 } },
  { slug: "sao-paulo", name: "São Paulo", country: "BR", locale: "pt-BR", currency: "BRL", center: { lat: -23.55, lon: -46.64 } },
  { slug: "madrid", name: "Madrid", country: "ES", locale: "es-ES", currency: "EUR", center: { lat: 40.42, lon: -3.7 } },
  { slug: "mexico-city", name: "Mexico City", country: "MX", locale: "es-MX", currency: "MXN", center: { lat: 19.43, lon: -99.13 } },
  { slug: "tokyo", name: "Tokyo", country: "JP", locale: "ja-JP", currency: "JPY", center: { lat: 35.68, lon: 139.74 } },
];

export function metroBySlug(slug: string): Metro | undefined {
  return METROS.find((m) => m.slug === slug);
}
