/**
 * Enrich (pipeline stage 5): attach derived signals across entities.
 *
 *  - Venues: team affiliation is NOT inferred from the venue name. A cuisine
 *    keyword (e.g. an Italian restaurant) says nothing about which nation's
 *    fans gather there, so guessing it produced wrong, low-precision data. Real
 *    `supportsTeams` comes from the curated supporter overlay (pipeline/supporters.ts)
 *    and, later, supporters'-club listings / social signals. Ratings and social
 *    engagement (ratingAvg, engagement) fill in when those sources land.
 *  - Events: resolve a seed `matchId` (source external id) to the canonical
 *    Match id, and inherit team affiliation from the linked match.
 */
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";

export function enrichVenues(venues: Venue[]): Venue[] {
  // Team affiliation is applied by the supporter overlay, not guessed here.
  log.info("enrich: venues", { venues: venues.length });
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
