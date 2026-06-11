"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { TEAMS, teamLabel } from "@/lib/teams";

export function AuthBar() {
  const { user, loading, register, login, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState<string | undefined>();

  if (loading) return <span className="muted">…</span>;

  if (user) {
    return (
      <div className="row" style={{ gap: 10 }}>
        <span className="muted">
          {user.displayName}
          {user.favoriteTeams[0] ? ` · ${teamLabel(user.favoriteTeams[0])}` : ""}
        </span>
        <button onClick={logout}>Log out</button>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="row" style={{ gap: 8 }}>
        <button onClick={() => setMode("login")}>Log in</button>
        <button className="primary" onClick={() => setMode("register")}>
          Sign up
        </button>
      </div>
    );
  }

  const submit = async () => {
    setError(undefined);
    try {
      if (mode === "register") await register(email, name || email.split("@")[0], team ? [team] : []);
      else await login(email);
      setMode(null);
      setEmail("");
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="panel" style={{ padding: 12, position: "absolute", right: 16, top: 56, zIndex: 1000, minWidth: 260 }}>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>{mode === "register" ? "Sign up" : "Log in"} — email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      {mode === "register" && (
        <>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Favorite team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">None</option>
              {TEAMS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.flag} {t.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {error && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
      <div className="row">
        <button onClick={() => setMode(null)}>Cancel</button>
        <button className="primary" onClick={submit} disabled={!email}>
          {mode === "register" ? "Create account" : "Log in"}
        </button>
      </div>
    </div>
  );
}
