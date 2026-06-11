"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { CITIES, cityBySlug } from "@/lib/cities";
import { TEAMS } from "@/lib/teams";
import type { FanEvent, RankedVenue, Recommendation } from "@/lib/types";
import { VenueList } from "@/components/VenueList";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { EventsPanel } from "@/components/EventsPanel";

// Leaflet touches window — load the map only on the client.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const KINDS = ["", "bar", "pub", "restaurant", "cafe", "fan_zone"];

export default function Home() {
  const [city, setCity] = useState("jersey-city");
  const [team, setTeam] = useState("");
  const [kind, setKind] = useState("");
  const [radius, setRadius] = useState(3000);
  const [origin, setOrigin] = useState(() => cityBySlug("jersey-city")!.center);

  const [venues, setVenues] = useState<RankedVenue[]>([]);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [view, setView] = useState<"map" | "list">("map");
  const [tab, setTab] = useState<"recs" | "events">("recs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // When the city changes, reset the origin to that city's center.
  const onCityChange = (slug: string) => {
    setCity(slug);
    const c = cityBySlug(slug);
    if (c) setOrigin(c.center);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setError("Could not get your location — using city center."),
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [v, e] = await Promise.all([
        api.nearbyVenues({ city, lat: origin.lat, lon: origin.lon, radius, team: team || undefined, kind: kind || undefined, limit: 50 }),
        api.nearbyEvents({ city, lat: origin.lat, lon: origin.lon, radius, team: team || undefined }),
      ]);
      setVenues(v.venues);
      setEvents(e.events);
      setRec(
        team
          ? await api.recommendations({ city, lat: origin.lat, lon: origin.lon, team, radius, limit: 5 })
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load. Is the API running on :3001?");
      setVenues([]);
      setEvents([]);
      setRec(null);
    } finally {
      setLoading(false);
    }
  }, [city, origin.lat, origin.lon, radius, team, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const headline = useMemo(() => {
    const c = cityBySlug(city)?.name ?? city;
    return `${venues.length} watch spots near ${c}`;
  }, [venues.length, city]);

  return (
    <main className="container">
      <div className="header">
        <h1>
          <span className="brand">Fan</span>Match
        </h1>
        <span className="tagline">Find the best place to watch the match.</span>
      </div>

      <div className="controls">
        <div className="field">
          <label>City</label>
          <select value={city} onChange={(e) => onCityChange(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Favorite team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">All teams</option>
            {TEAMS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Venue type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "" ? "Any" : k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Radius — {(radius / 1000).toFixed(1)} km</label>
          <input
            type="range"
            min={500}
            max={10000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Location</label>
          <button onClick={useMyLocation}>📍 Use my location</button>
        </div>
      </div>

      <div className="header" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>
          {loading ? "Searching…" : headline}
        </h2>
        <div className="tabs">
          <button className={`toggle ${view === "map" ? "active" : ""}`} onClick={() => setView("map")}>
            Map
          </button>
          <button className={`toggle ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            List
          </button>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ borderColor: "var(--danger)", marginBottom: 16 }}>
          <div className="empty" style={{ color: "var(--danger)" }}>{error}</div>
        </div>
      )}

      <div className="layout">
        <div className="panel">
          <h2>Venues</h2>
          {view === "map" ? (
            <MapView center={origin} radiusMeters={radius} venues={venues} activeId={activeId} />
          ) : (
            <VenueList venues={venues} activeId={activeId} onHover={setActiveId} />
          )}
        </div>

        <div className="panel">
          <h2 style={{ display: "flex", gap: 12 }}>
            <button
              className={`toggle ${tab === "recs" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => setTab("recs")}
            >
              Recommendations
            </button>
            <button
              className={`toggle ${tab === "events" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => setTab("events")}
            >
              Fan events ({events.length})
            </button>
          </h2>
          {tab === "recs" ? <RecommendationPanel rec={rec} /> : <EventsPanel events={events} />}
          {view === "map" && (
            <>
              <h2>Ranked list</h2>
              <VenueList venues={venues.slice(0, 20)} activeId={activeId} onHover={setActiveId} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
