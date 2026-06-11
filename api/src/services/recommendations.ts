/**
 * Recommendation service (PRD §6.6). Personalizes venue suggestions from the
 * user's favorite team + location.
 *
 *   "If you support Argentina and are in Jersey City, these are the top venues
 *    nearby."
 *
 * Phase 1 is a ranking-driven recommender: it reuses the discovery ranking
 * (which already folds in team-fan-match) and biases toward venues that
 * explicitly support the team. Past-interaction personalization arrives with
 * user accounts in Phase 2.
 */
import type { Repository } from "../data/repository.js";
import type { GeoPoint, Match, RankedVenue } from "../domain/models.js";
import { DiscoveryService } from "./discovery.js";

export interface RecommendationQuery {
  city: string;
  origin: GeoPoint;
  radiusMeters: number;
  team: string;
  limit?: number;
}

export interface Recommendation {
  team: string;
  city: string;
  topVenues: RankedVenue[];
  /** Upcoming fixtures for the team — useful context for the UI. */
  upcomingMatches: Match[];
  rationale: string;
}

export class RecommendationService {
  private readonly discovery: DiscoveryService;

  constructor(private readonly repo: Repository) {
    this.discovery = new DiscoveryService(repo);
  }

  async recommend(q: RecommendationQuery): Promise<Recommendation> {
    const ranked = await this.discovery.nearbyVenues({
      city: q.city,
      origin: q.origin,
      radiusMeters: q.radiusMeters,
      team: q.team,
    });

    // Prefer venues that explicitly support the team; fall back to top ranked.
    const supporters = ranked.filter((v) => v.supportsTeams.includes(q.team));
    const pool = supporters.length > 0 ? supporters : ranked;
    const topVenues = pool.slice(0, q.limit ?? 10);

    const upcomingMatches = (await this.discovery.matches(q.city, q.team)).filter(
      (m) => new Date(m.kickoff).getTime() >= Date.now(),
    );

    const rationale =
      supporters.length > 0
        ? `${supporters.length} venue(s) near you are known ${q.team} supporter spots.`
        : `No dedicated ${q.team} venues found nearby yet — showing the top-ranked watch spots.`;

    return {
      team: q.team,
      city: q.city,
      topVenues,
      upcomingMatches,
      rationale,
    };
  }
}
