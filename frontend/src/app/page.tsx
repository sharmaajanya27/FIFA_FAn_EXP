"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CITIES, cityBySlug, nearestCity } from "@/lib/cities";
import { worldCupStatus, type SeasonStatus } from "@/lib/worldCup";
import { teamByCode, TEAMS } from "@/lib/teams";
import { affiliationLine, kindLabel } from "@/lib/festival";
import { FEATURES } from "@/lib/features";
import { formatKickoff } from "@/lib/format";
import type { FanEvent, Match, RankedVenue } from "@/lib/types";
import { Lineup } from "@/components/festival/Lineup";
import { EventsPanel } from "@/components/EventsPanel";
import { CreateEventForm } from "@/components/CreateEventForm";
import { LiveEventsPanel } from "@/components/LiveEventsPanel";
import { CommunityPanel } from "@/components/CommunityPanel";

// Leaflet touches window — load the map only on the client.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const router = useRouter();

  // Derive initial city/team from URL params at state-init time (avoids a
  // second render+fetch that caused the flicker).
  const [city, setCity] = useState(() => {
    if (typeof window === "undefined") return "jersey-city";
    const c = new URLSearchParams(window.location.search).get("city");
    return c && cityBySlug(c) ? c : "jersey-city";
  });
  const [team, setTeam] = useState(() => {
    if (typeof window === "undefined") return "";
    return (
      new URLSearchParams(window.location.search).get("team")?.toUpperCase() ??
      ""
    );
  });
  // Fixed search defaults — the filter surface stays minimal (city + location
  // + team). Venue type is unrestricted and the radius is a sensible 5 km.
  const kind = "";
  const radius = 5000;
  const [origin, setOrigin] = useState(() => {
    if (typeof window !== "undefined") {
      const c = new URLSearchParams(window.location.search).get("city");
      if (c && cityBySlug(c)) return cityBySlug(c)!.center;
    }
    return cityBySlug("jersey-city")!.center;
  });

  const [venues, setVenues] = useState<RankedVenue[]>([]);
  const [events, setEvents] = useState<FanEvent[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<"map" | "list">("list");
  const [nav, setNav] = useState<"crews" | "fixtures" | "myteam">("crews");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  // Label of the current search origin (set when the user shares their location).
  const [placeLabel, setPlaceLabel] = useState<string | undefined>();

  // Seasonal World Cup banner status. Lazy-init avoids a hydration mismatch
  // (date-based) while eliminating a post-mount re-render.
  const [season] = useState<SeasonStatus | null>(() =>
    typeof window === "undefined" ? null : worldCupStatus(),
  );

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

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const [v, e, m] = await Promise.all([
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
        api.matches(city, team || undefined),
      ]);
      setVenues(v.venues);
      setEvents(e.events);
      setMatches(m.matches);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load. Is the API running on :3001?",
      );
    } finally {
      setLoading(false);
    }
  }, [city, origin.lat, origin.lon, radius, team, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const cityName = useMemo(() => cityBySlug(city)?.name ?? "your city", [city]);
  const followingTeam = team ? teamByCode(team) : undefined;

  // Hero eyebrow: the next scheduled match (stage · kickoff · home v away),
  // else the seasonal World Cup status when no fixtures are loaded.
  const nextMatch = matches[0];
  const heroEyebrow = useMemo(() => {
    if (nextMatch) {
      const stage = nextMatch.stage ?? nextMatch.competition;
      return `${stage} · ${formatKickoff(nextMatch.kickoff)} · ${nextMatch.homeTeam} v ${nextMatch.awayTeam}`;
    }
    if (season?.show) return `FIFA World Cup 26 · ${season.status}`;
    return "Find your watch party";
  }, [nextMatch, season]);

  // Drop-cap stat: total fans checked in across nearby watch parties + events.
  // Resilient — when live presence is sparse it falls back to the spot count.
  const goingTotal = useMemo(() => {
    const v = venues.reduce((sum, x) => sum + (x.hereCount ?? 0), 0);
    const e = events.reduce((sum, x) => sum + (x.goingCount ?? 0), 0);
    return v + e;
  }, [venues, events]);
  const hasLivePresence = goingTotal > 0;
  const dropStat = hasLivePresence ? goingTotal : venues.length;

  const teamWord = followingTeam ? `${followingTeam.name} fans` : "Fans";
  const partyWord = venues.length === 1 ? "party" : "parties";
  const heroLede = hasLivePresence
    ? `${teamWord} are taking over ${venues.length} watch ${partyWord} across ${cityName} right now. Find your section, find your people — and bring the noise.`
    : `${venues.length} watch ${venues.length === 1 ? "spot is" : "spots are"} ready for the match across ${cityName}. Find your section, find your people — and bring the noise.`;

  // The top-ranked watch party becomes the headliner panel.
  const headliner = venues[0];

  // Clicking a watch spot opens its dedicated page (mirrors fan events).
  const openVenue = (venue: RankedVenue) =>
    router.push(`/venue/${city}/${encodeURIComponent(venue.id)}`);

  const scrollToLineup = () =>
    document
      .getElementById("lineup-title")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const navItems = useMemo(
    () =>
      (
        [
          { id: "crews", label: "Crews" },
          { id: "fixtures", label: "Fixtures" },
          { id: "myteam", label: "My Team" },
        ] as const
      ).filter((i) => i.id !== "myteam" || FEATURES.community),
    [],
  );

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <div className="page-nav-row">
        <nav className="mast-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-link"
              aria-current={nav === item.id ? "page" : undefined}
              onClick={() => setNav(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="following">
            <label htmlFor="following-team">Following</label>
            <select
              id="following-team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="">All teams</option>
              {TEAMS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </span>
        </nav>
      </div>

      <main id="main" className="container">
        {error && (
          <div
            className="panel"
            style={{ borderColor: "var(--danger)", margin: "20px 0" }}
            role="alert"
          >
            <div className="empty" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          </div>
        )}

        {nav === "crews" && (
          <>
            <section className="crew-hero" aria-labelledby="hero-title">
              <div className="crew-hero-main">
                <p className="hero-eyebrow">
                  <span className="rule" aria-hidden="true" />
                  {heroEyebrow}
                </p>
                <h1 className="hero-title" id="hero-title">
                  Your team.<br />Your people.<br />
                  <span className="pop">Your party.</span>
                </h1>
                <p className="hero-lede">
                  <span className="dropcap" aria-hidden="true">
                    {dropStat}
                  </span>
                  {heroLede}
                </p>
                <div className="hero-cta">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={scrollToLineup}
                  >
                    Join the party →
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setView("map");
                      scrollToLineup();
                    }}
                  >
                    See them on the map
                  </button>
                </div>
                {season?.show && (
                  <p className="season-banner" role="note">
                    {season.live && (
                      <span className="season-live" aria-hidden="true" />
                    )}
                    <span className="season-flags" aria-hidden="true">
                      🇨🇦 🇺🇸 🇲🇽
                    </span>
                    <span className="season-title">FIFA World Cup 26</span>
                    <span className="season-status">{season.status}</span>
                  </p>
                )}
              </div>

              {headliner && (
                <aside
                  className="headliner on-dark"
                  aria-label="Tonight's headliner"
                >
                  <div className="headliner-top">
                    <span>Tonight&rsquo;s headliner</span>
                    <span className="no">№ 01</span>
                  </div>
                  <div className="headliner-pitch" aria-hidden="true">
                    <span className="fan" />
                    <span className="headliner-crest">
                      <span>★</span>
                      <span>
                        {followingTeam?.code ??
                          headliner.dominantTeam ??
                          headliner.supportsTeams[0] ??
                          "ALL"}
                      </span>
                    </span>
                  </div>
                  <div className="headliner-name">{headliner.name}</div>
                  <div className="headliner-meta">
                    {kindLabel(headliner.kind)} · {affiliationLine(headliner)}
                  </div>
                  <div className="headliner-foot">
                    {headliner.hereCount ? (
                      <span className="headliner-going">
                        <span className="n">{headliner.hereCount}</span>
                        <span className="u">going</span>
                      </span>
                    ) : headliner.fanRating !== undefined ? (
                      <span className="headliner-going">
                        <span className="n">
                          ★ {headliner.fanRating.toFixed(1)}
                        </span>
                        <span className="u">rated</span>
                      </span>
                    ) : (
                      <span className="headliner-going">
                        <span className="u">Top pick near you</span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-gold"
                      onClick={() => openVenue(headliner)}
                    >
                      Join →
                    </button>
                  </div>
                </aside>
              )}
            </section>

            <div
              className="header"
              style={{ justifyContent: "space-between", marginTop: 28 }}
            >
              <div>
                <label className="sr-only" htmlFor="hero-city">
                  City
                </label>
                <select
                  id="hero-city"
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
                </select>{" "}
                <button type="button" onClick={useMyLocation}>
                  📍 Use my location
                </button>
                {placeLabel && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    📍 Centered on {placeLabel}
                  </div>
                )}
              </div>
              <div className="tabs" role="group" aria-label="Result view">
                <button
                  type="button"
                  className={`toggle ${view === "list" ? "active" : ""}`}
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  List
                </button>
                <button
                  type="button"
                  className={`toggle ${view === "map" ? "active" : ""}`}
                  aria-pressed={view === "map"}
                  onClick={() => setView("map")}
                >
                  Map
                </button>
              </div>
            </div>

            {view === "map" ? (
              <div className="panel" style={{ marginTop: 12 }}>
                <MapView center={origin} radiusMeters={radius} venues={venues} />
              </div>
            ) : (
              <Lineup venues={venues} events={events} city={city} />
            )}
          </>
        )}

        {nav === "fixtures" && (
          <section
            className="layout"
            style={{ marginTop: 28 }}
            aria-label="Fixtures and live scores"
          >
            <LiveEventsPanel />
            <div className="panel">
              <h2>Fan events ({events.length})</h2>
              {FEATURES.business && (
                <CreateEventForm city={city} origin={origin} onCreated={load} />
              )}
              <EventsPanel events={events} />
            </div>
          </section>
        )}

        {FEATURES.community && nav === "myteam" && (
          <section style={{ marginTop: 28 }} aria-label="My team community">
            <CommunityPanel />
          </section>
        )}

        {loading && venues.length === 0 && (
          <p className="muted" style={{ marginTop: 16 }} aria-live="polite">
            Searching…
          </p>
        )}
      </main>

      <footer className="site-footer">
        <span className="footer-brand">
          Tu <span className="brand">Parea</span>
        </span>
        <span className="footer-host">World Cup 2026</span>
        <span className="footer-copy">
          © {new Date().getFullYear()} Tu Parea. All rights reserved.
        </span>
        <span className="footer-note">
          Not affiliated with FIFA. Team and tournament names are trademarks of
          their respective owners.
        </span>
      </footer>
    </>
  );
}
