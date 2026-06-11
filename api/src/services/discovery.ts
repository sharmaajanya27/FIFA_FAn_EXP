/**
 * Discovery service (PRD §6.1–6.4): location-based venue search with team and
 * venue-kind filtering, plus venue detail, fixtures, and nearby events. Orchestrates
 * the repository + ranking engine; handlers stay thin.
 */
import type { Repository } from "../data/repository.js";
import type {
  Event,
  GeoPoint,
  Match,
  RankedVenue,
  Venue,
} from "../domain/models.js";
import { rankVenues, type RankParams } from "../ranking/rank.js";
import { haversineMeters } from "../util/geo.js";

export interface NearbyQuery {
  city: string;
  origin: GeoPoint;
  radiusMeters: number;
  team?: string;
  kind?: string;
  limit?: number;
}

export class DiscoveryService {
  constructor(private readonly repo: Repository) {}

  /** Ranked venues near a point within a city (PRD §6.1, §6.5). */
  async nearbyVenues(q: NearbyQuery): Promise<RankedVenue[]> {
    const venues = await this.repo.venues(q.city);
    const params: RankParams = {
      origin: q.origin,
      radiusMeters: q.radiusMeters,
      team: q.team,
    };
    const ranked = rankVenues(venues, params, q.kind);
    return q.limit ? ranked.slice(0, q.limit) : ranked;
  }

  async venueById(city: string, id: string): Promise<Venue | undefined> {
    const venues = await this.repo.venues(city);
    return venues.find((v) => v.id === id);
  }

  /** Fixtures, optionally filtered by team code, sorted by kickoff. */
  async matches(city: string, team?: string): Promise<Match[]> {
    const matches = await this.repo.matches(city);
    const filtered = team
      ? matches.filter((m) => m.homeTeam === team || m.awayTeam === team)
      : matches;
    return [...filtered].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  }

  /** Fan events near a point, sorted by start time. */
  async nearbyEvents(q: {
    city: string;
    origin: GeoPoint;
    radiusMeters: number;
    team?: string;
  }): Promise<(Event & { distanceMeters: number })[]> {
    const events = await this.repo.events(q.city);
    return events
      .filter((e) => !q.team || e.teams.includes(q.team))
      .map((e) => ({
        ...e,
        distanceMeters: Math.round(haversineMeters(q.origin, e.geo)),
      }))
      .filter((e) => e.distanceMeters <= q.radiusMeters)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}
