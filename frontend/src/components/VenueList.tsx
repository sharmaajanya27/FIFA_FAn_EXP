"use client";

import type { RankedVenue } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { directionsUrl, formatDistance, formatScore } from "@/lib/format";

interface Props {
  venues: RankedVenue[];
  activeId?: string;
  onHover?: (id: string | undefined) => void;
  onSelect?: (venue: RankedVenue) => void;
}

export function VenueList({ venues, activeId, onHover, onSelect }: Props) {
  if (venues.length === 0) {
    return <div className="empty">No venues match your filters. Try widening the radius.</div>;
  }
  return (
    <ul className="list">
      {venues.map((v, i) => (
        <li
          key={v.id}
          className="venue"
          style={activeId === v.id ? { background: "var(--panel-2)" } : undefined}
          onMouseEnter={() => onHover?.(v.id)}
          onMouseLeave={() => onHover?.(undefined)}
        >
          <div className="rank">{i + 1}</div>
          <div className="body">
            <div className="row">
              <span
                className="name"
                style={onSelect ? { cursor: "pointer" } : undefined}
                onClick={() => onSelect?.(v)}
              >
                {v.name}
              </span>
              <a
                href={directionsUrl(v.geo.lat, v.geo.lon, v.name)}
                target="_blank"
                rel="noreferrer"
              >
                Directions ↗
              </a>
            </div>
            <div className="meta">
              {formatDistance(v.distanceMeters)} away
              {v.address ? ` · ${v.address}` : ""}
              {v.hours ? ` · ${v.hours}` : ""}
            </div>
            <div className="badges">
              <span className="badge kind">{v.kind}</span>
              {v.supportsTeams.map((t) => (
                <span key={t} className="badge team">
                  {teamLabel(t)}
                </span>
              ))}
              {v.ratingAvg !== undefined && (
                <span className="badge">★ {v.ratingAvg.toFixed(1)}</span>
              )}
              <span className="badge">match score {formatScore(v.finalScore)}</span>
            </div>
            <div className="score-bar">
              <span style={{ width: `${Math.round(v.finalScore * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
