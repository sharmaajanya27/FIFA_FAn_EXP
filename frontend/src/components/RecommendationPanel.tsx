"use client";

import type { AiRecommendation } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { formatKickoff } from "@/lib/format";
import { AI_PITCH_ENABLED } from "@/lib/flags";

interface Props {
  rec: AiRecommendation | null;
  mode: "smart" | "ai";
  onMode: (m: "smart" | "ai") => void;
}

export function RecommendationPanel({ rec, mode, onMode }: Props) {
  return (
    <div>
      <div className="rec">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Matchday pick
          </span>
          {/* AI matchday pitch — kept for a future launch, hidden until the
              Claude workflow ships (see lib/flags.ts). */}
          {AI_PITCH_ENABLED && (
            <div className="tabs">
              <button
                className={`toggle ${mode === "smart" ? "active" : ""}`}
                style={{ padding: "3px 9px", fontSize: 11 }}
                onClick={() => onMode("smart")}
              >
                Smart
              </button>
              <button
                className={`toggle ${mode === "ai" ? "active" : ""}`}
                style={{ padding: "3px 9px", fontSize: 11 }}
                onClick={() => onMode("ai")}
              >
                ✨ AI
              </button>
            </div>
          )}
        </div>
        {!rec ? (
          <div className="muted">Pick a team to get personalized recommendations.</div>
        ) : AI_PITCH_ENABLED ? (
          <>
            {rec.aiStatus === "coming_soon" && (
              <div
                className="badge"
                style={{ color: "var(--accent-2)", borderColor: "var(--accent-2)", marginBottom: 8 }}
              >
                ✨ AI recommendations — coming soon
              </div>
            )}
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{rec.aiSummary}</div>
          </>
        ) : (
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>{rec.rationale}</div>
        )}
      </div>

      {rec &&
        rec.topVenues.slice(0, 5).map((v, i) => (
          <div className="rec" key={v.id}>
            <div className="row">
              <span>
                <strong>
                  {i + 1}. {v.name}
                </strong>{" "}
                <span className="muted">· {v.kind}</span>
                {v.featured && <span className="badge" style={{ marginLeft: 6, color: "var(--accent)", borderColor: "var(--accent)" }}>★ Featured</span>}
              </span>
              <span className="muted">{Math.round(v.finalScore * 100)}</span>
            </div>
          </div>
        ))}

      {rec && rec.upcomingMatches.length > 0 && (
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
