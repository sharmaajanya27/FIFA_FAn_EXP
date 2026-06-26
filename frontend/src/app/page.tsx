"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CITIES, cityBySlug, nearestCity } from "@/lib/cities";
import { cityTheme, scatterBalls } from "@/lib/cityThemes";
import { worldCupStatus, type SeasonStatus } from "@/lib/worldCup";
import { TEAMS } from "@/lib/teams";
import { FEATURES } from "@/lib/features";
import type { FanEvent, RankedVenue } from "@/lib/types";
import { VenueList } from "@/components/VenueList";
import { EventsPanel } from "@/components/EventsPanel";
import { CreateEventForm } from "@/components/CreateEventForm";
import { LiveEventsPanel } from "@/components/LiveEventsPanel";
import { CommunityPanel } from "@/components/CommunityPanel";

// Leaflet touches window — load the map only on the client.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [city, setCity] = useState("jersey-city");
  const [team, setTeam] = useState("");
  // Fixed search defaults — the filter surface stays minimal (city + location
  // + team). Venue type is unrestricted and the radius is a sensible 5 km.
  const kind = "";
  const radius = 5000;
  const [origin, setOrigin] = useState(() => cityBySlug("jersey-city")!.center);

  const [venues, setVenues] = useState<RankedVenue[]>([]);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [view, setView] = useState<"map" | "list">("map");
  const [tab, setTab] = useState<"bars" | "events">("events");
  const [nav, setNav] = useState<"discover" | "live" | "community">("discover");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Label of the current search origin (set when the user shares their location).
  const [placeLabel, setPlaceLabel] = useState<string | undefined>();

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
    setPlaceLabel(undefined);
    const c = cityBySlug(slug);
    if (c) setOrigin(c.center);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        // Venues are stored per-city, so snap the dataset to the closest
        // supported city — otherwise searching a far-away city's venues from
        // here returns nothing within the radius.
        const near = nearestCity(here);
        if (near.slug !== city) setCity(near.slug);
        setPlaceLabel(`Your location · ${near.name}`);
        setOrigin(here);
      },
      () => setError("Could not get your location — using city center."),
    );
  };

  // Deep-link hydration: the SEO landing pages link here with ?city=&team= so
  // the app opens pre-focused on that selection. Read once on mount from the
  // URL directly (client-only) — this avoids needing a Suspense boundary that
  // useSearchParams would otherwise require for static rendering.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("city");
    if (c && cityBySlug(c)) onCityChange(c);
    const t = sp.get("team");
    if (t) setTeam(t.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load. Is the API running on :3001?",
      );
      setVenues([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [city, origin.lat, origin.lon, radius, team, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sports-bar shortlist for the right panel: the top-ranked bars & pubs — the
  // venues most likely to be showing the match with a crowd.
  const sportsBars = useMemo(
    () =>
      venues.filter((v) => v.kind === "bar" || v.kind === "pub").slice(0, 15),
    [venues],
  );

  const theme = useMemo(() => cityTheme(city), [city]);
  const balls = useMemo(() => scatterBalls(city), [city]);

  // Clicking a watch spot opens its dedicated page (mirrors fan events).
  const openVenue = (venue: RankedVenue) =>
    router.push(`/venue/${city}/${encodeURIComponent(venue.id)}`);

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
        {(["discover", "live", "community"] as const)
          .filter((n) => n !== "community" || FEATURES.community)
          .map((n) => (
            <button
              key={n}
              className={`toggle ${nav === n ? "active" : ""}`}
              onClick={() => setNav(n)}
            >
              {n === "discover"
                ? "Discover"
                : n === "live"
                  ? "Live scores"
                  : "Community"}
            </button>
          ))}
      </div>

      {nav === "live" && <LiveEventsPanel />}
      {FEATURES.community && nav === "community" && <CommunityPanel />}

      {nav === "discover" && (
        <>
          <div className="controls controls-min">
            <div className="field">
              <label>City</label>
              <select
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              >
                {[...CITIES]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
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
              <label>Location</label>
              <button onClick={useMyLocation}>📍 Use my location</button>
            </div>
          </div>

          <div className="header" style={{ justifyContent: "space-between" }}>
            <div>
              {loading ? (
                <h2 style={{ fontSize: 18, margin: 0 }}>Searching…</h2>
              ) : null}
              {placeLabel && (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  📍 Centered on {placeLabel}
                </div>
              )}
            </div>
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
                  team={team || undefined}
                  onHover={setActiveId}
                  onSelect={openVenue}
                />
              )}
            </div>

            <div className="panel">
              <h2 style={{ display: "flex", gap: 12 }}>
                <button
                  className={`toggle ${tab === "events" ? "active" : ""}`}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => setTab("events")}
                >
                  Fan events ({events.length})
                </button>
                <button
                  className={`toggle ${tab === "bars" ? "active" : ""}`}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  onClick={() => setTab("bars")}
                >
                  Watch spots ({sportsBars.length})
                </button>
              </h2>
              {tab === "events" ? (
                <>
                  {FEATURES.business && (
                    <CreateEventForm
                      city={city}
                      origin={origin}
                      onCreated={load}
                    />
                  )}
                  <EventsPanel events={events} />
                </>
              ) : (
                <VenueList
                  venues={sportsBars}
                  activeId={activeId}
                  team={team || undefined}
                  onHover={setActiveId}
                  onSelect={openVenue}
                />
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
