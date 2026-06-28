/**
 * Dependency container. Builds the read repository, the write store, and auth
 * once. Engagement feature services are lightweight and constructed from
 * `store` inside their own handler modules, so each feature stays self-contained.
 */
import type { ApiEnv } from "./config/env.js";
import type { Repository } from "./data/repository.js";
import { AuthService } from "./auth/auth.js";
import type { User } from "./domain/engagement.js";
import type { Store } from "./store/jsonStore.js";
import { DiscoveryService } from "./services/discovery.js";
import { RecommendationService } from "./services/recommendations.js";
import { ReviewService } from "./services/reviews.js";
import { EventEngagementService } from "./services/eventEngagement.js";
import { VenueEngagementService } from "./services/venueEngagement.js";
import { AiRecommendationService } from "./services/aiRecommendations.js";
import { CrowdEstimationService } from "./services/crowdEstimation.js";
import { EventService } from "./services/events.js";
import {
  CompositeVenueOverlay,
  SponsorshipService,
} from "./services/sponsorship.js";
import { BusinessService } from "./services/business.js";
import { GeocodeService } from "./services/geocode.js";
import { AnalyticsService } from "./services/analytics.js";
import { LiveEventsService } from "./services/liveEvents.js";

export interface Container {
  env: ApiEnv;
  repo: Repository;
  store: Store;
  auth: AuthService;
  /** Community reviews; also overlaid onto discovery to feed §6.5 ranking. */
  reviews: ReviewService;
  discovery: DiscoveryService;
  recommendations: RecommendationService;
  aiRecommendations: AiRecommendationService;
  crowdEstimation: CrowdEstimationService;
  events: EventService;
  /** Anonymous fan-event RSVP / vibe / review engagement (v1). */
  eventEngagement: EventEngagementService;
  /** Anonymous watch-spot presence / vibe / review engagement (v1). */
  venueEngagement: VenueEngagementService;
  sponsorship: SponsorshipService;
  /** Business-submitted venue listings (PRD §8). */
  business: BusinessService;
  /** Zip/neighborhood → point geocoding (PRD §6.1). */
  geocode: GeocodeService;
  analytics: AnalyticsService;
  /** Live sporting events ticker (ESPN-backed, read-only). */
  liveEvents: LiveEventsService;
}

export function buildContainer(
  env: ApiEnv,
  repo: Repository,
  store: Store,
): Container {
  const auth = new AuthService(store.collection<User>("users"));
  const reviews = new ReviewService(store);
  const events = new EventService(store);
  const venueEngagement = new VenueEngagementService(store);
  const sponsorship = new SponsorshipService(store);
  const business = new BusinessService(store);
  // Reviews set the rating-based score; venue engagement adds live crowd
  // metrics (stars/here/vibes); sponsorship then boosts featured venues.
  const venueOverlay = new CompositeVenueOverlay([
    reviews,
    venueEngagement,
    sponsorship,
  ]);
  // Business listings are merged into discovery alongside Phase 0 venues.
  const recommendations = new RecommendationService(
    repo,
    venueOverlay,
    business,
  );

  return {
    env,
    repo,
    store,
    auth,
    reviews,
    discovery: new DiscoveryService(repo, venueOverlay, events, business),
    recommendations,
    aiRecommendations: new AiRecommendationService(recommendations, env),
    crowdEstimation: new CrowdEstimationService(repo, store),
    events,
    eventEngagement: new EventEngagementService(store),
    venueEngagement,
    sponsorship,
    business,
    geocode: new GeocodeService(),
    analytics: new AnalyticsService(env.dataDir),
    liveEvents: new LiveEventsService(),
  };
}
