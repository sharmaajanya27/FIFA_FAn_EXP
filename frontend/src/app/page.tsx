"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { CITIES, cityBySlug } from "@/lib/cities";
import { cityTheme, scatterBalls } from "@/lib/cityThemes";
import { worldCupStatus, type SeasonStatus } from "@/lib/worldCup";
import { TEAMS } from "@/lib/teams";
import type { AiRecommendation, FanEvent, RankedVenue } from "@/lib/types";
import { VenueList } from "@/components/VenueList";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { EventsPanel } from "@/components/EventsPanel";
import { AuthBar } from "@/components/AuthBar";
import { VenueDetail } from "@/components/VenueDetail";
import { CreateEventForm } from "@/components/CreateEventForm";
import { PredictionsPanel } from "@/components/PredictionsPanel";
import { CommunityPanel } from "@/components/CommunityPanel";

// Leaflet touches window — load the map only on the client.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const KINDS = ["", "bar", "pub", "restaurant", "cafe", "fan_zone"];

export default function Home() {
  const [city, setCity] = useState("jersey-city");
  const [team, setTeam] = useState("");
  const [kind, setKind] = useState("");
  const [radius, setRadius] = useState(3000);
  const [origin, setOrigin] = useState(() => cityBySlug("jersey-city")!.center);
  // Which anchor the search is centered on. Downtown is the default; stadium is
  // an alternative origin; custom = the user's shared geolocation.
  const [originMode, setOriginMode] = useState<
    "downtown" | "stadium" | "custom"
  >("downtown");

  const [venues, setVenues] = useState<RankedVenue[]>([]);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [rec, setRec] = useState<AiRecommendation | null>(null);
  const [recMode, setRecMode] = useState<"smart" | "ai">("smart");
  const [activeId, setActiveId] = useState<string | undefined>();
  const [view, setView] = useState<"map" | "list">("map");
  const [tab, setTab] = useState<"recs" | "events">("recs");
  const [nav, setNav] = useState<"discover" | "predictions" | "community">(
    "discover",
  );
  const [selected, setSelected] = useState<RankedVenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Seasonal World Cup banner status. Computed on the client (after mount) so
  // the date-based message stays accurate without causing a hydration
  // mismatch with the server-rendered HTML.
  const [season, setSeason] = useState<SeasonStatus | null>(null);
  useEffect(() => {
    setSeason(worldCupStatus());
  }, []);

  // When the city changes, reset the origin to that city's center (downtown).
  const onCityChange = (slug: string) => {
    setCity(slug);
    setOriginMode("downtown");
    const c = cityBySlug(slug);
    if (c) setOrigin(c.center);
  };

  // Switch the search origin between downtown and the stadium.
  const onOriginModeChange = (mode: "downtown" | "stadium") => {
    setOriginMode(mode);
    const c = cityBySlug(city);
    if (!c) return;
    if (mode === "stadium" && c.stadium) setOrigin(c.stadium.center);
    else setOrigin(c.center);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginMode("custom");
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => setError("Could not get your location — using city center."),
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [v, e] = await Promise.all([
        api.nearbyVenues({
          city,
          lat: origin.lat,
          lon: origin.lon,
          radius,
          team: team || undefined,
          kind: kind || undefined,
          limit: 50,
        }),
        api.nearbyEvents({
          city,
          lat: origin.lat,
          lon: origin.lon,
          radius,
          team: team || undefined,
        }),
      ]);
      setVenues(v.venues);
      setEvents(e.events);
      setRec(
        team
          ? await api.aiRecommendations({
              city,
              lat: origin.lat,
              lon: origin.lon,
              team,
              radius,
              mode: recMode,
            })
          : null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load. Is the API running on :3001?",
      );
      setVenues([]);
      setEvents([]);
      setRec(null);
    } finally {
      setLoading(false);
    }
  }, [city, origin.lat, origin.lon, radius, team, kind, recMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const headline = useMemo(() => {
    const c = cityBySlug(city)?.name ?? city;
    return `${venues.length} watch spots near ${c}`;
  }, [venues.length, city]);

  const theme = useMemo(() => cityTheme(city), [city]);
  const balls = useMemo(() => scatterBalls(city), [city]);

  return (
    <main className="container">
      <div
        className="city-bg"
        aria-hidden
        style={
          { ["--city-accent" as string]: theme.accent } as React.CSSProperties
        }
      >
        {balls.map((ball, i) => (
          <span
            key={i}
            className="ball"
            style={
              {
                left: `${ball.left}%`,
                top: `${ball.top}%`,
                width: `${ball.size}px`,
                height: `${ball.size}px`,
                transform: `rotate(${ball.rotate}deg)`,
              } as React.CSSProperties
            }
          />
        ))}
        <div
          className="city-skyline"
          role="img"
          aria-label={theme.label}
          style={
            {
              ["--city-accent" as string]: theme.accent,
              ["--city-shape" as string]: `url(/cities/${theme.shape}.svg)`,
            } as React.CSSProperties
          }
        />
      </div>
      <header className="hero">
        <div className="hero-top">
          <div className="hero-brand">
            <span className="crest" aria-hidden>
              📺
            </span>
            <div>
              <h1>
                <span className="brand">Fan</span>Watch
              </h1>
              <p className="tagline">
                Find the best place to watch the match — any game, any city.
              </p>
            </div>
          </div>
          <AuthBar />
        </div>
        {season?.show && (
          <div className="season-banner" role="note">
            {season.live && <span className="season-live" aria-hidden />}
            <span className="season-flags" aria-hidden>
              🇨🇦 🇺🇸 🇲🇽
            </span>
            <span className="season-title">FIFA World Cup 26</span>
            <span className="season-status">{season.status}</span>
          </div>
        )}
      </header>

      <div className="tabs nav-tabs" style={{ marginBottom: 16 }}>
        {(["discover", "predictions", "community"] as const).map((n) => (
          <button
            key={n}
            className={`toggle ${nav === n ? "active" : ""}`}
            onClick={() => setNav(n)}
          >
            {n === "discover"
              ? "Discover"
              : n === "predictions"
                ? "Predictions"
                : "Community"}
          </button>
        ))}
      </div>

      {nav === "predictions" && <PredictionsPanel city={city} />}
      {nav === "community" && <CommunityPanel />}
      {selected && (
        <VenueDetail
          venue={selected}
          city={city}
          onClose={() => setSelected(null)}
        />
      )}

      {nav === "discover" && (
        <>
          <div className="controls">
            <div className="field">
              <label>City</label>
              <select
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              >
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.country} {c.name}
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
              <label>Search around</label>
              <select
                value={originMode === "custom" ? "downtown" : originMode}
                onChange={(e) =>
                  onOriginModeChange(e.target.value as "downtown" | "stadium")
                }
              >
                <option value="downtown">Downtown</option>
                {cityBySlug(city)?.stadium && (
                  <option value="stadium">
                    🏟️ {cityBySlug(city)!.stadium!.name}
                  </option>
                )}
              </select>
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
              <button
                className={`toggle ${view === "map" ? "active" : ""}`}
                onClick={() => setView("map")}
              >
                Map
              </button>
              <button
                className={`toggle ${view === "list" ? "active" : ""}`}
                onClick={() => setView("list")}
              >
                List
              </button>
            </div>
          </div>

          {error && (
            <div
              className="panel"
              style={{ borderColor: "var(--danger)", marginBottom: 16 }}
            >
              <div className="empty" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            </div>
          )}

          <div className="layout">
            <div className="panel">
              <h2>Venues</h2>
              {view === "map" ? (
                <MapView
                  center={origin}
                  radiusMeters={radius}
                  venues={venues}
                  activeId={activeId}
                />
              ) : (
                <VenueList
                  venues={venues}
                  activeId={activeId}
                  onHover={setActiveId}
                  onSelect={setSelected}
                />
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
              {tab === "recs" ? (
                <RecommendationPanel
                  rec={rec}
                  mode={recMode}
                  onMode={setRecMode}
                />
              ) : (
                <>
                  <CreateEventForm
                    city={city}
                    origin={origin}
                    onCreated={load}
                  />
                  <EventsPanel events={events} />
                </>
              )}
              {view === "map" && (
                <>
                  <h2>Ranked list</h2>
                  <VenueList
                    venues={venues.slice(0, 20)}
                    activeId={activeId}
                    onHover={setActiveId}
                    onSelect={setSelected}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
      <footer className="site-footer">
        <span className="footer-brand">
          <span className="brand">Fan</span>Watch
        </span>
        <span className="footer-copy">
          © {new Date().getFullYear()} FanWatch. All rights reserved.
        </span>
        <span className="footer-note">
          Not affiliated with FIFA. Team and tournament names are trademarks of
          their respective owners.
        </span>
      </footer>
    </main>
  );
}
