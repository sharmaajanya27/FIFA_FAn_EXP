"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { LiveEvent } from "@/lib/types";
import { formatKickoff } from "@/lib/format";

const REFRESH_MS = 30_000;

const STATE_LABEL: Record<LiveEvent["state"], string> = {
  in: "Live",
  pre: "Upcoming",
  post: "Final",
};

export function LiveEventsPanel() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [sport, setSport] = useState<string>("all");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const { events } = await api.liveEvents();
      setEvents(events);
      setUpdatedAt(new Date());
      setError(undefined);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't load live events right now.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const sports = useMemo(
    () => Array.from(new Set(events.map((e) => e.sport))).sort(),
    [events],
  );

  const shown = useMemo(
    () => (sport === "all" ? events : events.filter((e) => e.sport === sport)),
    [events, sport],
  );

  const liveCount = useMemo(
    () => events.filter((e) => e.state === "in").length,
    [events],
  );

  return (
    <div className="panel">
      <div className="scores-head">
        <div className="scores-head-main">
          <h2 className="scores-title">
            World Cup 2026 scores
            {liveCount > 0 && (
              <span className="live-pill">
                <span className="season-live" aria-hidden /> {liveCount} live
              </span>
            )}
          </h2>
          <p className="scores-sub">
            Live &amp; upcoming
            {updatedAt
              ? ` · updated ${updatedAt.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh scores"
        >
          <span aria-hidden="true">↻</span> {loading ? "…" : "Refresh"}
        </button>
      </div>

      {sports.length > 1 && (
        <div className="tabs" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          {["all", ...sports].map((s) => (
            <button
              key={s}
              className={`toggle ${sport === s ? "active" : ""}`}
              onClick={() => setSport(s)}
            >
              {s === "all" ? "All sports" : s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="empty" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {!error && shown.length === 0 && (
        <div className="empty">
          {loading ? "Loading live scores…" : "No events to show right now."}
        </div>
      )}

      {shown.map((e) => (
        <LiveEventRow key={`${e.league}-${e.id}`} event={e} />
      ))}
    </div>
  );
}

function LiveEventRow({ event: e }: { event: LiveEvent }) {
  const live = e.state === "in";
  return (
    <div
      className="rec"
      style={{ borderLeft: live ? "3px solid var(--accent)" : undefined }}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 6 }}
      >
        <span className="muted" style={{ fontSize: 12 }}>
          {e.sport} · {e.league}
        </span>
        <span
          className="badge"
          style={{
            background: live ? "var(--accent)" : "transparent",
            color: live ? "#fff" : "var(--muted)",
            border: live ? "none" : "1px solid var(--border, #ccc)",
          }}
        >
          {live && (
            <span
              className="season-live"
              aria-hidden
              style={{ marginRight: 6 }}
            />
          )}
          {STATE_LABEL[e.state]}
        </span>
      </div>

      <TeamLine
        team={e.home}
        dim={e.state === "post" && lost(e.home, e.away)}
      />
      <TeamLine
        team={e.away}
        dim={e.state === "post" && lost(e.away, e.home)}
      />

      <div className="when" style={{ marginTop: 6 }}>
        {live
          ? e.clock || e.detail || "In progress"
          : e.state === "pre"
            ? formatKickoff(e.startTime)
            : e.detail || "Final"}
        {e.venue ? ` · ${e.venue}` : ""}
      </div>
    </div>
  );
}

function TeamLine({ team, dim }: { team: LiveEvent["home"]; dim: boolean }) {
  return (
    <div
      className="row"
      style={{
        justifyContent: "space-between",
        opacity: dim ? 0.55 : 1,
        padding: "2px 0",
      }}
    >
      <span className="row" style={{ gap: 8, minWidth: 0 }}>
        {team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo}
            alt=""
            width={20}
            height={20}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span style={{ width: 20, textAlign: "center" }}>⚽</span>
        )}
        <span style={{ fontWeight: 600 }}>{team.name}</span>
      </span>
      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {team.score ?? "–"}
      </span>
    </div>
  );
}

function lost(a: LiveEvent["home"], b: LiveEvent["home"]): boolean {
  const sa = Number(a.score);
  const sb = Number(b.score);
  if (!Number.isFinite(sa) || !Number.isFinite(sb)) return false;
  return sa < sb;
}
