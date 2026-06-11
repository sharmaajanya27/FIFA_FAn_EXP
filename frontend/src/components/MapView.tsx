"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { RankedVenue } from "@/lib/types";
import { directionsUrl, formatDistance, formatScore } from "@/lib/format";

interface Props {
  center: { lat: number; lon: number };
  radiusMeters: number;
  venues: RankedVenue[];
  activeId?: string;
}

// Colored dot markers via divIcon — sidesteps Leaflet's default image-asset
// path problems under bundlers.
function dot(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #04210f;box-shadow:0 0 0 2px ${color}55"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ORIGIN_ICON = dot("#38bdf8", 18);
const VENUE_ICON = dot("#2bd576", 12);
const ACTIVE_ICON = dot("#fbbf24", 18);

function Recenter({ center, radius }: { center: { lat: number; lon: number }; radius: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lon]);
    map.fitBounds(
      L.latLng(center.lat, center.lon).toBounds(radius * 2.2),
      { padding: [20, 20] },
    );
  }, [map, center.lat, center.lon, radius]);
  return null;
}

export default function MapView({ center, radiusMeters, venues, activeId }: Props) {
  return (
    <MapContainer
      className="map"
      center={[center.lat, center.lon]}
      zoom={14}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} radius={radiusMeters} />
      <Circle
        center={[center.lat, center.lon]}
        radius={radiusMeters}
        pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.06 }}
      />
      <Marker position={[center.lat, center.lon]} icon={ORIGIN_ICON}>
        <Popup>You are here</Popup>
      </Marker>
      {venues.map((v) => (
        <Marker
          key={v.id}
          position={[v.geo.lat, v.geo.lon]}
          icon={activeId === v.id ? ACTIVE_ICON : VENUE_ICON}
        >
          <Popup>
            <strong>{v.name}</strong>
            <br />
            {v.kind} · {formatDistance(v.distanceMeters)} away
            <br />
            match score {formatScore(v.finalScore)}
            <br />
            <a href={directionsUrl(v.geo.lat, v.geo.lon, v.name)} target="_blank" rel="noreferrer">
              Directions ↗
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
