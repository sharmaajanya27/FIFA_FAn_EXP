/**
 * Live sporting events (read-only). Aggregates ESPN's public, keyless
 * scoreboard JSON across a handful of leagues/sports and normalizes it to a
 * stable `LiveEvent` shape the frontend renders. This is a pure proxy: no
 * persistence, no auth — it keeps the third-party fetch server-side (avoids
 * browser CORS and shields the response shape behind our own contract).
 *
 * Source: https://site.api.espn.com/apis/site/v2/sports/<sport>/<league>/scoreboard
 */
import { log } from "../util/logger.js";

/** Leagues polled for the live ticker. Order is the display fallback order. */
const LEAGUES: { sport: string; league: string; sportLabel: string }[] = [
  { sport: "soccer", league: "fifa.world", sportLabel: "Soccer" },
  { sport: "soccer", league: "uefa.champions", sportLabel: "Soccer" },
  { sport: "basketball", league: "nba", sportLabel: "Basketball" },
  { sport: "basketball", league: "wnba", sportLabel: "Basketball" },
  { sport: "baseball", league: "mlb", sportLabel: "Baseball" },
  { sport: "hockey", league: "nhl", sportLabel: "Hockey" },
];

export type LiveEventState = "pre" | "in" | "post";

export interface LiveEventTeam {
  name: string;
  abbreviation: string;
  logo?: string;
  score?: string;
}

export interface LiveEvent {
  id: string;
  sport: string;
  league: string;
  state: LiveEventState;
  /** Human status, e.g. "FT", "90'+6'", "7:00 PM EDT". */
  detail: string;
  /** Live game clock when in-progress, e.g. "63'" or "Q2 4:21". */
  clock?: string;
  startTime: string;
  venue?: string;
  home: LiveEventTeam;
  away: LiveEventTeam;
}

/** ESPN scoreboard response (only the fields we read). */
interface EspnScoreboard {
  leagues?: { name?: string; abbreviation?: string }[];
  events?: EspnEvent[];
}
interface EspnEvent {
  id: string;
  date: string;
  status?: {
    displayClock?: string;
    period?: number;
    type?: { state?: string; shortDetail?: string; detail?: string };
  };
  competitions?: {
    venue?: { fullName?: string };
    competitors?: {
      homeAway?: string;
      score?: string;
      team?: { displayName?: string; abbreviation?: string; logo?: string };
    }[];
  }[];
}

const EMPTY_TEAM: LiveEventTeam = { name: "TBD", abbreviation: "" };

export class LiveEventsService {
  constructor(
    private readonly base = "https://site.api.espn.com/apis/site/v2/sports",
  ) {}

  async list(): Promise<LiveEvent[]> {
    const results = await Promise.all(LEAGUES.map((l) => this.fetchLeague(l)));
    const events = results.flat();
    return events.sort(byLiveThenSoonest);
  }

  private async fetchLeague(cfg: {
    sport: string;
    league: string;
    sportLabel: string;
  }): Promise<LiveEvent[]> {
    const url = `${this.base}/${cfg.sport}/${cfg.league}/scoreboard`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        log.warn("liveEvents: upstream non-200", {
          league: cfg.league,
          status: res.status,
        });
        return [];
      }
      const data = (await res.json()) as EspnScoreboard;
      const leagueName = data.leagues?.[0]?.name ?? cfg.league;
      return (data.events ?? [])
        .map((e) => normalize(e, cfg.sportLabel, leagueName))
        .filter((e): e is LiveEvent => e !== null);
    } catch (err) {
      log.warn("liveEvents: fetch failed", {
        league: cfg.league,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}

function normalize(
  e: EspnEvent,
  sport: string,
  league: string,
): LiveEvent | null {
  const comp = e.competitions?.[0];
  if (!comp) return null;
  const home = team(comp.competitors?.find((c) => c.homeAway === "home"));
  const away = team(comp.competitors?.find((c) => c.homeAway === "away"));
  const rawState = e.status?.type?.state;
  const state: LiveEventState =
    rawState === "in" ? "in" : rawState === "post" ? "post" : "pre";
  return {
    id: e.id,
    sport,
    league,
    state,
    detail: e.status?.type?.shortDetail ?? e.status?.type?.detail ?? "",
    clock: state === "in" ? e.status?.displayClock : undefined,
    startTime: e.date,
    venue: comp.venue?.fullName,
    home,
    away,
  };
}

function team(
  c:
    | {
        score?: string;
        team?: { displayName?: string; abbreviation?: string; logo?: string };
      }
    | undefined,
): LiveEventTeam {
  if (!c?.team) return EMPTY_TEAM;
  return {
    name: c.team.displayName ?? "TBD",
    abbreviation: c.team.abbreviation ?? "",
    logo: c.team.logo,
    score: c.score,
  };
}

/** Live games first, then upcoming (soonest first), then completed. */
function byLiveThenSoonest(a: LiveEvent, b: LiveEvent): number {
  const rank = (s: LiveEventState) => (s === "in" ? 0 : s === "pre" ? 1 : 2);
  const r = rank(a.state) - rank(b.state);
  if (r !== 0) return r;
  return a.startTime.localeCompare(b.startTime);
}
