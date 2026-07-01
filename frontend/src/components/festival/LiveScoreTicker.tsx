"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { LiveEvent } from "@/lib/types";

const REFRESH_MS = 30_000;

/**
 * Auto-scrolling strip of World Cup scores under the masthead. The motion is
 * decorative: the marquee is duplicated for a seamless loop (the copy is
 * aria-hidden), it pauses on hover/focus and via an explicit Pause control
 * (WCAG 2.2.2), and it stops entirely under prefers-reduced-motion — where the
 * strip degrades to a normally scrollable list. It carries no aria-live, so it
 * never interrupts a screen reader; the full detail lives in the Fixtures tab.
 */
export function LiveScoreTicker() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { events } = await api.liveEvents();
        if (alive) setEvents(events);
      } catch {
        // The ticker is non-critical chrome — stay hidden rather than error.
      }
    };
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Lead with in-progress matches, then upcoming, then finals.
  const items = useMemo(() => {
    const order: Record<LiveEvent["state"], number> = { in: 0, pre: 1, post: 2 };
    return [...events].sort((a, b) => order[a.state] - order[b.state]);
  }, [events]);

  // Render an empty placeholder to prevent layout shift when data arrives.
  if (items.length === 0) {
    return <aside className="ticker ticker-empty" aria-hidden="true" />;
  }

  return (
    <aside
      className={`ticker${paused ? " paused" : ""}`}
      aria-label="Live World Cup scores"
    >
      <span className="ticker-tag" aria-hidden="true">
        <span className="ticker-dot" /> Live
      </span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          <ul className="ticker-list">
            {items.map((e) => (
              <TickerChip key={`${e.league}-${e.id}`} event={e} />
            ))}
          </ul>
          <ul className="ticker-list" aria-hidden="true">
            {items.map((e) => (
              <TickerChip key={`dup-${e.league}-${e.id}`} event={e} />
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        className="ticker-toggle"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
      >
        {paused ? "Play" : "Pause"}
        <span className="sr-only"> live scores ticker</span>
      </button>
    </aside>
  );
}

function TickerChip({ event: e }: { event: LiveEvent }) {
  const live = e.state === "in";
  const score =
    e.state === "pre"
      ? "vs"
      : `${e.home.score ?? "0"}–${e.away.score ?? "0"}`;
  const detail = live ? e.clock || e.detail || "" : e.state === "post" ? "FT" : "";
  return (
    <li className={`ticker-chip${live ? " live" : ""}`}>
      <span className="ticker-team">{e.home.abbreviation || e.home.name}</span>
      <span className="ticker-score">{score}</span>
      <span className="ticker-team">{e.away.abbreviation || e.away.name}</span>
      {detail ? <span className="ticker-detail">{detail}</span> : null}
    </li>
  );
}
