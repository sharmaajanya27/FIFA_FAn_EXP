"use client";

/**
 * Anonymous device identity for v1 fan-event engagement (no login).
 *
 * A random id is minted once per browser and persisted in localStorage. It is
 * NOT a security credential — just a stable handle so one device can toggle its
 * own RSVP and keep a single review/vibe identity. The same key also remembers
 * the fan's chosen favorite team so we can pre-fill it next time.
 */
const ANON_KEY = "fanwatch_anon_id";
const TEAM_KEY = "fanwatch_fav_team";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

/** Stable anonymous id for this browser (empty string during SSR). */
export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** The fan's remembered favorite team code, if they've picked one before. */
export function getStoredTeam(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(TEAM_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredTeam(code: string): void {
  if (typeof window === "undefined") return;
  try {
    if (code) window.localStorage.setItem(TEAM_KEY, code);
    else window.localStorage.removeItem(TEAM_KEY);
  } catch {
    // Ignore storage failures (private mode, quota).
  }
}
