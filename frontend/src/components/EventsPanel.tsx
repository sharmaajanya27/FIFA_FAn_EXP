"use client";

import { useRouter } from "next/navigation";
import type { FanEvent } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { vibeBand } from "@/lib/vibes";
import { directionsUrl, formatDistance, formatKickoff } from "@/lib/format";

export function EventsPanel({ events }: { events: FanEvent[] }) {
  const router = useRouter();
  if (events.length === 0) {
    return <div className="empty">No fan events nearby in this radius.</div>;
  }
  return (
    <div>
      {events.map((e) => (
        <div
          className="event clickable"
          key={e.id}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/event/${e.id}`)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              router.push(`/event/${e.id}`);
            }
          }}
        >
          <div className="row">
            <strong className="event-title">{e.title}</strong>
            <a
              href={directionsUrl(e.geo.lat, e.geo.lon, e.title)}
              target="_blank"
              rel="noreferrer"
              onClick={(ev) => ev.stopPropagation()}
            >
              Directions ↗
            </a>
          </div>
          <div className="when">
            {formatKickoff(e.startTime)} · {formatDistance(e.distanceMeters)}{" "}
            away
            {e.estAttendance ? ` · ~${e.estAttendance} fans` : ""}
          </div>
          {/* Live engagement metrics from anonymous RSVPs / vibes. */}
          {(e.goingCount || e.energy !== undefined) && (
            <div className="metrics">
              {e.goingCount ? (
                <span className="metric hot" title="Fans going">
                  👥 {e.goingCount} going
                </span>
              ) : null}
              {e.energy !== undefined ? (
                <span className="metric" title="Current crowd energy (0–10)">
                  {vibeBand(e.energy).emoji} {e.energy}/10
                </span>
              ) : null}
            </div>
          )}
          <div className="badges">
            <span className="badge kind">{e.kind.replace(/_/g, " ")}</span>
            {e.dominantTeam && (
              <span className="badge" title="Most attendees rep this team">
                Mostly {teamLabel(e.dominantTeam)}
              </span>
            )}
            {e.teams.map((t) => (
              <span key={t} className="badge team">
                {teamLabel(t)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
