"use client";

/**
 * MapLibre GL implementation of the discovery map — FanWatch's own vector
 * basemap rendered from self-hostable Protomaps PMTiles (no API key, $0 per
 * load). Drop-in alternative to the Leaflet `MapView`: identical props, swapped
 * via `NEXT_PUBLIC_MAP_ENGINE=maplibre` (see `lib/mapConfig`).
 */
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RankedVenue } from "@/lib/types";
import { directionsUrl, formatDistance, formatScore } from "@/lib/format";
import { MAP_GLYPHS_URL, MAP_PMTILES_URL } from "@/lib/mapConfig";

interface Props {
  center: { lat: number; lon: number };
  radiusMeters: number;
  venues: RankedVenue[];
  activeId?: string;
}

/** Register the pmtiles:// protocol with MapLibre exactly once per page. */
let pmtilesRegistered = false;
function ensurePmtiles(): void {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

/** Our own cartography — the FanWatch day palette over the Protomaps schema. */
function buildStyle(): StyleSpecification {
  const p = {
    bg: "#0a1f17",
    earth: "#0c241b",
    water: "#10384a",
    green: "#11302530",
    road: "#1f4338",
    roadCase: "#16302a",
    building: "#13322820",
    text: "#cdeee0",
    halo: "#04210f",
  };
  // Static, runtime-validated by MapLibre; cast past the strict expression types.
  return {
    version: 8,
    glyphs: MAP_GLYPHS_URL,
    sources: {
      protomaps: {
        type: "vector",
        url: "pmtiles://" + MAP_PMTILES_URL,
        attribution: "© OpenStreetMap · Protomaps",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": p.bg } },
      { id: "earth", type: "fill", source: "protomaps", "source-layer": "earth", paint: { "fill-color": p.earth } },
      {
        id: "green",
        type: "fill",
        source: "protomaps",
        "source-layer": "landuse",
        filter: ["match", ["get", "kind"], ["park", "forest", "wood", "grass", "pitch", "recreation_ground", "meadow"], true, false],
        paint: { "fill-color": p.green },
      },
      { id: "water", type: "fill", source: "protomaps", "source-layer": "water", paint: { "fill-color": p.water } },
      {
        id: "buildings",
        type: "fill",
        source: "protomaps",
        "source-layer": "buildings",
        minzoom: 13,
        paint: { "fill-color": p.building },
      },
      {
        id: "roads-case",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        minzoom: 7,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": p.roadCase, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 5, 18, 18] },
      },
      {
        id: "roads",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        minzoom: 8,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": p.road, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 14, 3.2, 18, 13] },
      },
      {
        id: "places",
        type: "symbol",
        source: "protomaps",
        "source-layer": "places",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 11, 12, 15],
        },
        paint: { "text-color": p.text, "text-halo-color": p.halo, "text-halo-width": 1.6 },
      },
    ],
  } as unknown as StyleSpecification;
}

/** A 64-gon GeoJSON polygon approximating a metric-radius circle. */
function circleFeature(center: { lat: number; lon: number }, radiusMeters: number) {
  const points = 64;
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = radiusMeters / 111_320;
  const dLon = radiusMeters / (111_320 * Math.cos(latRad));
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    ring.push([center.lon + dLon * Math.cos(t), center.lat + dLat * Math.sin(t)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } as GeoJSON.Feature<GeoJSON.Polygon>;
}

/** Escape text before injecting into popup HTML. */
function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function renderRadius(map: maplibregl.Map, center: { lat: number; lon: number }, radiusMeters: number): void {
  const data = circleFeature(center, radiusMeters);
  const existing = map.getSource("radius") as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource("radius", { type: "geojson", data });
    map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#38bdf8", "fill-opacity": 0.06 } });
    map.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#38bdf8", "line-opacity": 0.5, "line-width": 1.5 } });
  }
  const bounds = new maplibregl.LngLatBounds();
  data.geometry.coordinates[0]!.forEach((c) => bounds.extend(c as [number, number]));
  map.fitBounds(bounds, { padding: 24, maxZoom: 16, duration: 500 });
}

function renderMarkers(
  map: maplibregl.Map,
  markers: maplibregl.Marker[],
  center: { lat: number; lon: number },
  venues: RankedVenue[],
  activeId?: string,
): void {
  markers.forEach((m) => m.remove());
  markers.length = 0;

  const origin = new maplibregl.Marker({ color: "#38bdf8" })
    .setLngLat([center.lon, center.lat])
    .setPopup(new maplibregl.Popup({ offset: 14 }).setText("You are here"))
    .addTo(map);
  markers.push(origin);

  for (const v of venues) {
    const active = activeId === v.id;
    const size = active ? 18 : 13;
    const color = active ? "#fbbf24" : "#2bd576";
    const el = document.createElement("div");
    el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #04210f;box-shadow:0 0 0 2px ${color}55;cursor:pointer`;
    const popup = new maplibregl.Popup({ offset: 14 }).setHTML(
      `<strong>${esc(v.name)}</strong><br>${esc(v.kind)} · ${formatDistance(v.distanceMeters)} away<br>match score ${formatScore(v.finalScore)}<br><a href="${directionsUrl(v.geo.lat, v.geo.lon, v.name)}" target="_blank" rel="noreferrer">Directions ↗</a>`,
    );
    const marker = new maplibregl.Marker({ element: el }).setLngLat([v.geo.lon, v.geo.lat]).setPopup(popup).addTo(map);
    markers.push(marker);
  }
}

export default function MapViewGL({ center, radiusMeters, venues, activeId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Tear down on unmount only.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Create once, then re-render radius + markers whenever inputs change.
  useEffect(() => {
    if (!ref.current) return;
    let map = mapRef.current;
    if (!map) {
      ensurePmtiles();
      map = new maplibregl.Map({
        container: ref.current,
        style: buildStyle(),
        center: [center.lon, center.lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;
    }
    const m = map;
    const render = () => {
      renderRadius(m, center, radiusMeters);
      renderMarkers(m, markersRef.current, center, venues, activeId);
    };
    if (m.isStyleLoaded()) render();
    else m.once("load", render);
  }, [center, radiusMeters, venues, activeId]);

  return <div ref={ref} className="map" />;
}
