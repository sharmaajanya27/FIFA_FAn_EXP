"use client";

import type { Recommendation } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { formatKickoff } from "@/lib/format";

export function RecommendationPanel({ rec }: { rec: Recommendation | null }) {
  if (!rec) {
    return <div className="empty">Pick a team to get personalized recommendations.</div>;
  }
  return (
    <div>
      <div className="rec">
        <div className="rationale">{rec.rationale}</div>
      </div>
      {rec.topVenues.slice(0, 5).map((v, i) => (
        <div className="rec" key={v.id}>
          <div className="row">
            <span>
              <strong>{i + 1}. {v.name}</strong>{" "}
              <span className="muted">· {v.kind}</span>
            </span>
            <span className="muted">{Math.round(v.finalScore * 100)}</span>
          </div>
        </div>
      ))}
      {rec.upcomingMatches.length > 0 && (
        <>
          <div className="rec">
            <strong className="muted">Upcoming {teamLabel(rec.team)} fixtures</strong>
          </div>
          {rec.upcomingMatches.slice(0, 4).map((m) => (
            <div className="event" key={m.id}>
              <div>
                {teamLabel(m.homeTeam)} vs {teamLabel(m.awayTeam)}
              </div>
              <div className="when">
                {formatKickoff(m.kickoff)}
                {m.stage ? ` · ${m.stage}` : ""}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
