/**
 * Map engine configuration (frontend).
 *
 * FanWatch renders its own vector basemap with MapLibre GL from self-hostable
 * Protomaps PMTiles — no vendor SDK, no API key, $0 per map load. Choosing the
 * engine is a flag; production points the tile/glyph URLs at our own
 * S3 + CloudFront. Defaults target the public Protomaps demo archive so it runs
 * with zero setup in dev.
 */
export type MapEngine = "leaflet" | "maplibre";

/** Default stays "leaflet" so the shipping app is unchanged until we flip it. */
export const MAP_ENGINE: MapEngine =
  process.env.NEXT_PUBLIC_MAP_ENGINE === "maplibre" ? "maplibre" : "leaflet";

/**
 * Self-hostable single-file vector tiles (served via HTTP range requests).
 *
 * Default is a same-origin path: in dev, place a `basemap.pmtiles` extract under
 * `public/maps/` (e.g. `pmtiles extract <planet> public/maps/basemap.pmtiles
 * --bbox=<metro>`); in prod, point at our own S3 + CloudFront via
 * NEXT_PUBLIC_MAP_PMTILES_URL. Same-origin/CORS-enabled hosting is required —
 * the public Protomaps demo bucket sends no CORS headers and cannot be used
 * cross-origin from a browser.
 */
export const MAP_PMTILES_URL =
  process.env.NEXT_PUBLIC_MAP_PMTILES_URL || "/maps/basemap.pmtiles";

/** Font glyphs (PBF). Production: self-host alongside the tiles. */
export const MAP_GLYPHS_URL =
  process.env.NEXT_PUBLIC_MAP_GLYPHS_URL ||
  "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";
