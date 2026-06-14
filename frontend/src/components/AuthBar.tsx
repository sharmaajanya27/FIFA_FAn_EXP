"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { TEAMS, teamLabel } from "@/lib/teams";

export function AuthBar() {
  const { user, loading, register, login, logout } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | null>(null);
  const [accountType, setAccountType] = useState<"fan" | "business">("fan");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState<string | undefined>();

  if (loading) return <span className="muted">…</span>;

  if (user) {
    return (
      <div className="row" style={{ gap: 10 }}>
        <span className="muted">
          {user.displayName}
          {user.accountType === "business"
            ? " · Business"
            : user.favoriteTeams[0]
              ? ` · ${teamLabel(user.favoriteTeams[0])}`
              : ""}
        </span>
        {user.accountType === "business" && (
          <Link href="/business" className="toggle">
            My venue
          </Link>
        )}
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
      if (mode === "register") {
        await register(
          email,
          name || (accountType === "business" ? businessName : email.split("@")[0]),
          team ? [team] : [],
          accountType === "business"
            ? { accountType: "business", businessName }
            : { accountType: "fan" },
        );
      } else {
        await login(email);
      }
      setMode(null);
      setEmail("");
      setName("");
      setBusinessName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="panel" style={{ padding: 12, position: "absolute", right: 16, top: 56, zIndex: 1000, minWidth: 260 }}>
      {mode === "register" && (
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Account type</label>
          <div className="tabs">
            <button
              type="button"
              className={`toggle ${accountType === "fan" ? "active" : ""}`}
              onClick={() => setAccountType("fan")}
            >
              ⚽ Fan
            </button>
            <button
              type="button"
              className={`toggle ${accountType === "business" ? "active" : ""}`}
              onClick={() => setAccountType("business")}
            >
              🏪 Business
            </button>
          </div>
        </div>
      )}
      <div className="field" style={{ marginBottom: 8 }}>
        <label>{mode === "register" ? "Sign up" : "Log in"} — email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      {mode === "register" && (
        <>
          {accountType === "business" && (
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. The Corner Pub" />
            </div>
          )}
          <div className="field" style={{ marginBottom: 8 }}>
            <label>{accountType === "business" ? "Contact name" : "Display name"}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          {accountType === "fan" && (
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
          )}
        </>
      )}
      {error && <div className="muted" style={{ color: "var(--danger)", marginBottom: 8 }}>{error}</div>}
      <div className="row">
        <button onClick={() => setMode(null)}>Cancel</button>
        <button
          className="primary"
          onClick={submit}
          disabled={!email || (mode === "register" && accountType === "business" && !businessName.trim())}
        >
          {mode === "register" ? "Create account" : "Log in"}
        </button>
      </div>
    </div>
  );
}
