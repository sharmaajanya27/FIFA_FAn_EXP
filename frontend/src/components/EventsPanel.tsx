"use client";

import type { FanEvent } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { directionsUrl, formatDistance, formatKickoff } from "@/lib/format";

export function EventsPanel({ events }: { events: FanEvent[] }) {
  if (events.length === 0) {
    return <div className="empty">No fan events nearby in this radius.</div>;
  }
  return (
    <div>
      {events.map((e) => (
        <div className="event" key={e.id}>
          <div className="row">
            <strong>{e.title}</strong>
            <a href={directionsUrl(e.geo.lat, e.geo.lon, e.title)} target="_blank" rel="noreferrer">
              Directions ↗
            </a>
          </div>
          <div className="when">
            {formatKickoff(e.startTime)} · {formatDistance(e.distanceMeters)} away
            {e.estAttendance ? ` · ~${e.estAttendance} fans` : ""}
          </div>
          <div className="badges">
            <span className="badge kind">{e.kind.replace(/_/g, " ")}</span>
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
