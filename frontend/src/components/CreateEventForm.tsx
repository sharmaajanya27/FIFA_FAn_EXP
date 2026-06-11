"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import { TEAMS } from "@/lib/teams";

interface Props {
  city: string;
  origin: { lat: number; lon: number };
  onCreated: () => void;
}

export function CreateEventForm({ city, origin, onCreated }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("viewing_party");
  const [team, setTeam] = useState("");
  const [startTime, setStartTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!open) {
    return (
      <div className="rec">
        <button className="primary" onClick={() => setOpen(true)}>
          ＋ Create a fan event
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (!user) return setError("Log in to create an event.");
    if (!title.trim() || !startTime) return setError("Title and start time are required.");
    setBusy(true);
    setError(undefined);
    try {
      await api.createEvent({
        city,
        title: title.trim(),
        lat: origin.lat,
        lon: origin.lon,
        startTime: new Date(startTime).toISOString(),
        kind,
        teams: team ? [team] : [],
      });
      setTitle("");
      setStartTime("");
      setTeam("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rec">
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Event title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Argentina Final Watch Party" />
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
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        Location uses your current search point ({origin.lat.toFixed(3)}, {origin.lon.toFixed(3)}).
      </div>
      {error && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
      <div className="row">
        <button onClick={() => setOpen(false)}>Cancel</button>
        <button className="primary" disabled={busy} onClick={submit}>Create</button>
      </div>
    </div>
  );
}
