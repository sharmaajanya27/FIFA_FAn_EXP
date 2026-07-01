"use client";

/**
 * Business dashboard (PRD §8). A business-account owner lists their venue and
 * posts fan events; both flow into discovery so they appear in the public
 * "watch spots" list and on the map. Platform admins review everything at
 * /admin/business.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CITIES, cityBySlug } from "@/lib/cities";
import { TEAMS } from "@/lib/teams";
import { useAuth } from "@/components/AuthProvider";
import type { BusinessListing } from "@/lib/types";

const KINDS = ["bar", "pub", "restaurant", "cafe", "fan_zone"];

export default function BusinessPage() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.accountType !== "business") return;
    setRefreshing(true);
    try {
      const res = await api.myBusinessListings();
      setListings(res.listings);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return <main className="container"><p className="muted">Loading…</p></main>;
  }

  if (!user) {
    return (
      <main className="container">
        <Gate>
          <h1>Business sign-in required</h1>
          <p className="muted">
            Sign up as a <strong>Business</strong> on the{" "}
            <Link href="/">home page</Link> to list your venue and post events.
          </p>
        </Gate>
      </main>
    );
  }

  if (user.accountType !== "business") {
    return (
      <main className="container">
        <Gate>
          <h1>This is a fan account</h1>
          <p className="muted">
            You&apos;re signed in as a fan ({user.displayName}). Business listings
            require a business account — sign out and register a business account
            from the home page.
          </p>
          <Link href="/" className="toggle">← Back to Tu Parea</Link>
        </Gate>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="hero">
        <div className="hero-top">
          <div className="hero-brand">
            <span className="crest" aria-hidden>🏪</span>
            <div>
              <h1><span className="brand">Fan</span>Watch for Business</h1>
              <p className="tagline">
                {user.businessName ?? user.displayName} · list your venue and post matchday events.
              </p>
            </div>
          </div>
          <Link href="/" className="toggle">← Discover</Link>
        </div>
      </header>

      <div className="layout">
        <div className="panel">
          <h2>List a venue</h2>
          <ListingForm onCreated={refresh} />
        </div>
        <div className="panel">
          <h2>Post a fan event</h2>
          <EventForm listings={listings} />
          <h2 style={{ marginTop: 20 }}>
            Your venues {refreshing ? "…" : `(${listings.length})`}
          </h2>
          {listings.length === 0 ? (
            <div className="empty">No venues yet — add one on the left.</div>
          ) : (
            listings.map((l) => (
              <div className="rec" key={l.id}>
                <div className="row">
                  <strong>{l.name}</strong>
                  <span className="muted">{l.kind}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {l.address ? `${l.address} · ` : ""}
                  {cityBySlug(l.city ?? "")?.name ?? l.city}
                  {l.supportsTeams.length ? ` · supports ${l.supportsTeams.join(", ")}` : ""}
                </div>
                <span className="badge" style={{ marginTop: 6 }}>★ Live in watch spots</span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel" style={{ maxWidth: 520, margin: "10vh auto", textAlign: "center" }}>
      {children}
    </div>
  );
}

function ListingForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("bar");
  const [city, setCity] = useState("jersey-city");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const toggleTeam = (code: string) =>
    setTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  const submit = async () => {
    if (!name.trim()) return setError("A venue name is required.");
    setBusy(true);
    setError(undefined);
    setMsg(undefined);
    try {
      // Resolve the address/zip to a point; fall back to the city center.
      let lat: number | undefined;
      let lon: number | undefined;
      if (address.trim()) {
        try {
          const g = await api.geocode(address.trim(), city);
          lat = g.lat;
          lon = g.lon;
        } catch {
          /* fall through to city center */
        }
      }
      if (lat === undefined || lon === undefined) {
        const c = cityBySlug(city);
        lat = c?.center.lat;
        lon = c?.center.lon;
      }
      if (lat === undefined || lon === undefined) {
        throw new Error("Couldn't determine a location for this venue.");
      }
      await api.createBusinessListing({
        name: name.trim(),
        city,
        lat,
        lon,
        kind,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        supportsTeams: teams,
        capacity: capacity ? Number(capacity) : undefined,
      });
      setMsg("Listed! Your venue now appears in watch spots for " + (cityBySlug(city)?.name ?? city) + ".");
      setName("");
      setAddress("");
      setWebsite("");
      setTeams([]);
      setCapacity("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create listing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rec">
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Venue name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Corner Pub" />
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.country} {c.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Address or zip <span className="muted">(used to place you on the map)</span></label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Grove St or 07302" />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>
          Supporter base{" "}
          <span className="muted">(pick any teams your venue welcomes)</span>
        </label>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {TEAMS.map((t) => (
            <button
              type="button"
              key={t.code}
              className={`toggle ${teams.includes(t.code) ? "active" : ""}`}
              style={{ padding: "4px 9px", fontSize: 12 }}
              onClick={() => toggleTeam(t.code)}
              aria-pressed={teams.includes(t.code)}
            >
              {t.flag} {t.code}
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Capacity</label>
        <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 80" />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
      </div>
      {error && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
      {msg && <div className="muted" style={{ color: "var(--accent)", marginBottom: 8 }}>{msg}</div>}
      <button className="primary" disabled={busy} onClick={submit}>
        {busy ? "Listing…" : "Add venue to watch spots"}
      </button>
    </div>
  );
}

function EventForm({ listings }: { listings: BusinessListing[] }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("viewing_party");
  const [team, setTeam] = useState("");
  const [startTime, setStartTime] = useState("");
  const [venueId, setVenueId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!title.trim() || !startTime) return setError("Title and start time are required.");
    const venue = listings.find((l) => l.id === venueId) ?? listings[0];
    if (!venue) return setError("Add a venue first — events are hosted at one of your venues.");
    setBusy(true);
    setError(undefined);
    setMsg(undefined);
    try {
      await api.createEvent({
        city: venue.city ?? "jersey-city",
        title: title.trim(),
        lat: venue.geo.lat,
        lon: venue.geo.lon,
        startTime: new Date(startTime).toISOString(),
        kind,
        teams: team ? [team] : [],
      });
      setMsg("Event posted! It now shows in fan events near " + venue.name + ".");
      setTitle("");
      setStartTime("");
      setTeam("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post event.");
    } finally {
      setBusy(false);
    }
  };

  if (listings.length === 0) {
    return (
      <div className="empty">Add a venue first to host events there.</div>
    );
  }

  return (
    <div className="rec">
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Event title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. England vs USA — Big Screen Party" />
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>At venue</label>
        <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="viewing_party">Viewing party</option>
            <option value="fan_zone">Fan zone</option>
            <option value="community_watch">Community watch</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Any</option>
            {TEAMS.map((t) => (
              <option key={t.code} value={t.code}>{t.flag} {t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Start time</label>
        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>
      {error && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
      {msg && <div className="muted" style={{ color: "var(--accent)", marginBottom: 8 }}>{msg}</div>}
      <button className="primary" disabled={busy} onClick={submit}>
        {busy ? "Posting…" : "Post event"}
      </button>
    </div>
  );
}
