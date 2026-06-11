"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import { TEAMS, teamLabel } from "@/lib/teams";
import type { CommunityPost } from "@/lib/types";
import { formatKickoff } from "@/lib/format";

export function CommunityPanel() {
  const { user } = useAuth();
  const [team, setTeam] = useState(user?.favoriteTeams[0] ?? "ARG");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(async () => {
    const f = await api.feed(team);
    setPosts(f.posts);
  }, [team]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = async () => {
    if (!user) return setError("Log in to post.");
    if (!text.trim()) return;
    try {
      await api.post(team, text.trim());
      setText("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const like = async (id: string) => {
    if (!user) return setError("Log in to like.");
    await api.likePost(id);
    await reload();
  };

  return (
    <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="row">
        <span>Community feed</span>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          {TEAMS.map((t) => (
            <option key={t.code} value={t.code}>{t.flag} {t.name}</option>
          ))}
        </select>
      </h2>

      <div className="rec">
        <div className="row" style={{ gap: 8 }}>
          <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Post to ${teamLabel(team)} fans…`} />
          <button className="primary" onClick={submit}>Post</button>
        </div>
        {error && <div className="muted" style={{ color: "var(--danger)", marginTop: 6 }}>{error}</div>}
      </div>

      {posts.length === 0 && <div className="empty">No posts yet — start the conversation.</div>}
      {posts.map((p) => (
        <div className="event" key={p.id}>
          <div className="row">
            <strong>{p.userName}</strong>
            <span className="when">{formatKickoff(p.createdAt)}</span>
          </div>
          <div style={{ margin: "4px 0" }}>{p.text}</div>
          <button onClick={() => like(p.id)}>♥ {p.likedBy.length}</button>
        </div>
      ))}
    </div>
  );
}
