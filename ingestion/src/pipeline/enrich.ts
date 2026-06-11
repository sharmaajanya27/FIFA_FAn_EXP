/**
 * Enrich (pipeline stage 5): attach derived signals across entities.
 *
 *  - Venues: infer supported teams from the venue name (supporter-bar signal).
 *    A real implementation would also pull ratings/images from a places API
 *    and social engagement from a social connector — those fields are wired
 *    (ratingAvg, engagement) and fill in when those sources land.
 *  - Events: resolve a seed `matchId` (source external id) to the canonical
 *    Match id, and inherit team affiliation from the linked match.
 */
import { matchTeamCode } from "../config/teams.js";
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";

export function enrichVenues(venues: Venue[]): Venue[] {
  let tagged = 0;
  for (const v of venues) {
    if (v.supportsTeams.length === 0) {
      const code = matchTeamCode(v.name);
      if (code) {
        v.supportsTeams = [code];
        tagged++;
      }
    }
  }
  log.info("enrich: venue team affiliation", { venues: venues.length, tagged });
  return venues;
}

export function enrichEvents(events: Event[], matches: Match[]): Event[] {
  // Map both the canonical id and each source external id -> canonical Match.
  const byAnyId = new Map<string, Match>();
  for (const m of matches) {
    byAnyId.set(m.id, m);
    for (const s of m.sources) byAnyId.set(s.externalId, m);
  }

  let linked = 0;
  for (const e of events) {
    if (!e.matchId) continue;
    const match = byAnyId.get(e.matchId);
    if (!match) continue;
    e.matchId = match.id; // normalize to canonical id
    linked++;
    if (e.teams.length === 0) {
      e.teams = [match.homeTeam, match.awayTeam];
    }
  }
  log.info("enrich: event→match links", { events: events.length, linked });
  return events;
}
