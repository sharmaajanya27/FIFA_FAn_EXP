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

/** Optional overlay that augments venues with community signals (reviews). */
export interface VenueOverlay {
  applyOverlay(venues: Venue[]): Promise<Venue[]>;
}

/** Optional source of additional (user-created) events to merge into discovery. */
export interface EventOverlay {
  forCity(city: string): Promise<Event[]>;
  /** Resolve a single user-created event by id (event detail). */
  byId?(id: string): Promise<Event | undefined>;
}

/** Optional source of additional (business-submitted) venues to merge in. */
export interface VenueSource {
  forCity(city: string): Promise<Venue[]>;
}

export class DiscoveryService {
  constructor(
    private readonly repo: Repository,
    private readonly overlay?: VenueOverlay,
    private readonly eventOverlay?: EventOverlay,
    private readonly venueSource?: VenueSource,
  ) {}

  private async loadVenues(city: string): Promise<Venue[]> {
    const [base, extra] = await Promise.all([
      this.repo.venues(city),
      this.venueSource ? this.venueSource.forCity(city) : Promise.resolve([]),
    ]);
    const venues = [...base, ...extra];
    return this.overlay ? this.overlay.applyOverlay(venues) : venues;
  }

  /** Ranked venues near a point within a city (PRD §6.1, §6.5). */
  async nearbyVenues(q: NearbyQuery): Promise<RankedVenue[]> {
    const venues = await this.loadVenues(q.city);
    const params: RankParams = {
      origin: q.origin,
      radiusMeters: q.radiusMeters,
      team: q.team,
    };
    const ranked = rankVenues(venues, params, q.kind);
    return q.limit ? ranked.slice(0, q.limit) : ranked;
  }

  async venueById(city: string, id: string): Promise<Venue | undefined> {
    const venues = await this.loadVenues(city);
    return venues.find((v) => v.id === id);
  }

  /** A single fan event by id — seed events first, then user-created. */
  async eventById(id: string): Promise<Event | undefined> {
    const seed = await this.repo.eventById(id);
    if (seed) return seed;
    if (this.eventOverlay?.byId) return this.eventOverlay.byId(id);
    return undefined;
  }

  /** Fixtures, optionally filtered by team code, sorted by kickoff. */
  async matches(city: string, team?: string): Promise<Match[]> {
    const matches = await this.repo.matches(city);
    const filtered = team
      ? matches.filter((m) => m.homeTeam === team || m.awayTeam === team)
      : matches;
    return [...filtered].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  }

  /** Fan events near a point. Team (if any) boosts matching events to the top. */
  async nearbyEvents(q: {
    city: string;
    origin: GeoPoint;
    radiusMeters: number;
    team?: string;
  }): Promise<(Event & { distanceMeters: number })[]> {
    const seed = await this.repo.events(q.city);
    const userEvents = this.eventOverlay
      ? await this.eventOverlay.forCity(q.city)
      : [];
    const events = [...seed, ...userEvents];
    return events
      .map((e) => ({
        ...e,
        distanceMeters: Math.round(haversineMeters(q.origin, e.geo)),
      }))
      .filter((e) => e.distanceMeters <= q.radiusMeters)
      .sort((a, b) => {
        // Events featuring the user's team surface first; then soonest kickoff.
        if (q.team) {
          const am = a.teams.includes(q.team) ? 0 : 1;
          const bm = b.teams.includes(q.team) ? 0 : 1;
          if (am !== bm) return am - bm;
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }
}
