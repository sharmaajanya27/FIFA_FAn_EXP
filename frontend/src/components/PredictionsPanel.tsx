"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import type { LeaderboardEntry, Match } from "@/lib/types";
import { teamLabel } from "@/lib/teams";
import { formatKickoff } from "@/lib/format";

export function PredictionsPanel({ city }: { city: string }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [scores, setScores] = useState<Record<string, { h: number; a: number }>>({});
  const [msg, setMsg] = useState<string | undefined>();

  const reload = useCallback(async () => {
    const [m, lb] = await Promise.all([api.matches(city), api.leaderboard()]);
    setMatches(m.matches);
    setBoard(lb.leaderboard);
  }, [city]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const set = (id: string, k: "h" | "a", v: number) =>
    setScores((s) => {
      const cur = s[id] ?? { h: 0, a: 0 };
      return { ...s, [id]: { ...cur, [k]: Math.max(0, v) } };
    });

  const predict = async (m: Match) => {
    if (!user) return setMsg("Log in to predict.");
    const s = scores[m.id] ?? { h: 0, a: 0 };
    try {
      await api.predict(m.id, s.h, s.a);
      setMsg(`Predicted ${teamLabel(m.homeTeam)} ${s.h}–${s.a} ${teamLabel(m.awayTeam)}`);
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="layout">
      <div className="panel">
        <h2>Fixtures — predict the score</h2>
        {matches.map((m) => {
          const s = scores[m.id] ?? { h: 0, a: 0 };
          return (
            <div className="rec" key={m.id}>
              <div className="when">{formatKickoff(m.kickoff)}{m.stage ? ` · ${m.stage}` : ""}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <span style={{ flex: 1 }}>{teamLabel(m.homeTeam)}</span>
                <input type="number" min={0} style={{ width: 56 }} value={s.h} onChange={(e) => set(m.id, "h", Number(e.target.value))} />
                <span className="muted">–</span>
                <input type="number" min={0} style={{ width: 56 }} value={s.a} onChange={(e) => set(m.id, "a", Number(e.target.value))} />
                <span style={{ flex: 1, textAlign: "right" }}>{teamLabel(m.awayTeam)}</span>
                <button className="primary" onClick={() => predict(m)}>Predict</button>
              </div>
            </div>
          );
        })}
        {msg && <div className="empty" style={{ color: "var(--accent)" }}>{msg}</div>}
      </div>

      <div className="panel">
        <h2>Leaderboard</h2>
        {board.length === 0 && <div className="empty">No predictions yet.</div>}
        {board.map((e, i) => (
          <div className="rec row" key={e.userId}>
            <span><strong>{i + 1}.</strong> {e.userName}</span>
            <span className="muted">{e.points} pts · {e.predictions} preds</span>
          </div>
        ))}
      </div>
    </div>
  );
}
