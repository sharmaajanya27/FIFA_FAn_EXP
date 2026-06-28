"use client";

import type { RankedVenue } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { vibeBand } from "@/lib/vibes";
import { directionsUrl, formatDistance } from "@/lib/format";

interface Props {
  venues: RankedVenue[];
  activeId?: string;
  /** Selected team code — surfaces a "known supporter spot" badge when matched. */
  team?: string;
  onHover?: (id: string | undefined) => void;
  onSelect?: (venue: RankedVenue) => void;
}

export function VenueList({
  venues,
  activeId,
  team,
  onHover,
  onSelect,
}: Props) {
  if (venues.length === 0) {
    return (
      <div className="empty">
        No venues match your filters. Try widening the radius.
      </div>
    );
  }
  return (
    <ul className="list">
      {venues.map((v, i) => (
        <li
          key={v.id}
          className={`venue${onSelect ? " clickable" : ""}`}
          style={
            activeId === v.id ? { background: "var(--panel-2)" } : undefined
          }
          onMouseEnter={() => onHover?.(v.id)}
          onMouseLeave={() => onHover?.(undefined)}
          onClick={() => onSelect?.(v)}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={(e) => {
            if (onSelect && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onSelect(v);
            }
          }}
        >
          <div className="rank">{i + 1}</div>
          <div className="body">
            <div className="row">
              <span className="name">{v.name}</span>
              <a
                href={directionsUrl(v.geo.lat, v.geo.lon, v.name)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Directions ↗
              </a>
            </div>
            <div className="meta">
              {formatDistance(v.distanceMeters)} away
              {v.address ? ` · ${v.address}` : ""}
              {v.hours ? ` · ${v.hours}` : ""}
            </div>
            {/* Live crowd metrics from anonymous engagement. */}
            {(v.fanRating !== undefined ||
              v.hereCount ||
              v.energy ||
              v.vibeCount) && (
              <div className="metrics">
                {v.fanRating !== undefined && (
                  <span className="metric" title="Fan rating">
                    ★ {v.fanRating.toFixed(1)}
                    {v.fanRatingCount ? ` (${v.fanRatingCount})` : ""}
                  </span>
                )}
                {v.hereCount ? (
                  <span className="metric hot" title="Fans here now">
                    🔥 {v.hereCount} here
                  </span>
                ) : null}
                {v.energy !== undefined ? (
                  <span className="metric" title="Current crowd energy (0–10)">
                    {vibeBand(v.energy).emoji} {v.energy}/10
                  </span>
                ) : null}
              </div>
            )}
            <div className="badges">
              {v.featured && (
                <span
                  className="badge"
                  style={{
                    color: "var(--accent)",
                    borderColor: "var(--accent)",
                  }}
                >
                  ★ Featured
                </span>
              )}
              {team && v.supportsTeams.includes(team) && (
                <span
                  className="badge"
                  style={{
                    color: "var(--accent-2)",
                    borderColor: "var(--accent-2)",
                  }}
                >
                  🟢 {teamLabel(team)} spot
                </span>
              )}
              {v.dominantTeam && (
                <span className="badge" title="Most fans here rep this team">
                  Mostly {teamLabel(v.dominantTeam)}
                </span>
              )}
              <span className="badge kind">{v.kind}</span>
              {v.supportsTeams.map((t) => (
                <span key={t} className="badge team">
                  {teamLabel(t)}
                </span>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
