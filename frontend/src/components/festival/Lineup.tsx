"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FanEvent, RankedVenue } from "@/lib/types";
import {
  affiliationLine,
  capacityOf,
  kindLabel,
  paletteTextAt,
} from "@/lib/festival";
import { formatDistance, formatKickoff } from "@/lib/format";

type Sort = "fans" | "dist";

/** Number of venue rows visible before "Show all" is needed. */
const COLLAPSED_COUNT = 8;

interface Props {
  venues: RankedVenue[];
  /** Fan events to feature at the top of the lineup. */
  events?: FanEvent[];
  /** City slug for building venue-detail links. */
  city: string;
}

/**
 * "Tonight's Lineup" — fan events first, then watch parties ranked by the
 * crowd. Collapses after 8 venues with a "Show all" toggle.
 */
export function Lineup({ venues, events = [], city }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("fans");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    const list = [...venues];
    if (sort === "dist") {
      list.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } else {
      list.sort((a, b) => (b.hereCount ?? 0) - (a.hereCount ?? 0));
    }
    return list;
  }, [venues, sort]);

  const maxHere = useMemo(
    () => Math.max(0, ...venues.map((v) => v.hereCount ?? 0)),
    [venues],
  );

  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const hasMore = rows.length > COLLAPSED_COUNT;

  if (venues.length === 0 && events.length === 0) {
    return (
      <section className="lineup" aria-labelledby="lineup-title">
        <div className="lineup-head">
          <h2 className="lineup-title" id="lineup-title">
            Tonight&rsquo;s Lineup
          </h2>
        </div>
        <p className="empty">
          No watch parties match your filters yet. Try widening the search or
          picking another city.
        </p>
      </section>
    );
  }

  return (
    <section className="lineup" aria-labelledby="lineup-title">
      <div className="lineup-head">
        <div>
          <h2 className="lineup-title" id="lineup-title">
            Tonight&rsquo;s Lineup
          </h2>
          <p className="lineup-sub">
            Fan events &amp; watch parties near you
          </p>
        </div>
        <div className="sort" role="group" aria-label="Sort watch parties">
          <button
            type="button"
            aria-pressed={sort === "fans"}
            onClick={() => setSort("fans")}
          >
            Most fans
          </button>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <button
            type="button"
            aria-pressed={sort === "dist"}
            onClick={() => setSort("dist")}
          >
            Closest
          </button>
        </div>
      </div>

      {/* Fan events — compact cards above the venue list */}
      {events.length > 0 && (
        <div className="lineup-events">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              className="lineup-event"
              onClick={() => router.push(`/event/${e.id}`)}
            >
              <span className="lineup-event-badge">Event</span>
              <span className="lineup-event-title">{e.title}</span>
              <span className="lineup-event-meta">
                {formatKickoff(e.startTime)} · {formatDistance(e.distanceMeters)}
                {e.goingCount ? ` · ${e.goingCount} going` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Venue rows */}
      <ol className="lineup-rows">
        {visibleRows.map((v, i) => {
          const here = v.hereCount ?? 0;
          const cap = capacityOf(here, maxHere);
          return (
            <li key={v.id}>
              <Link
                className="lineup-row"
                href={`/venue/${city}/${encodeURIComponent(v.id)}`}
              >
                <span
                  className="lineup-rank"
                  style={{ color: paletteTextAt(i) }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="lineup-main">
                  <span className="lineup-name-row">
                    <span className="lineup-name">{v.name}</span>
                    <span
                      className="lineup-tag"
                      style={{ color: paletteTextAt(i) }}
                    >
                      {kindLabel(v.kind)}
                    </span>
                  </span>
                  <span className="lineup-meta">{affiliationLine(v)}</span>
                </span>
                <span className="lineup-side">
                  {here > 0 ? (
                    <span className="lineup-going">
                      <span className="n">{here}</span>
                      <span className="u">here</span>
                    </span>
                  ) : v.fanRating !== undefined ? (
                    <span className="lineup-going">
                      <span className="n">★ {v.fanRating.toFixed(1)}</span>
                    </span>
                  ) : null}
                  {cap && (
                    <span
                      className={`lineup-cap${cap.packed ? " packed" : ""}`}
                    >
                      {cap.label}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {hasMore && !expanded && (
        <button
          type="button"
          className="lineup-expand"
          onClick={() => setExpanded(true)}
        >
          Show all {rows.length} spots →
        </button>
      )}
    </section>
  );
}
