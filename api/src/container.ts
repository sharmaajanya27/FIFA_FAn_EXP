/**
 * Dependency container. Builds the read repository, the write store, and auth
 * once. Engagement feature services are lightweight and constructed from
 * `store` inside their own handler modules, so each feature stays self-contained.
 */
import type { ApiEnv } from "./config/env.js";
import type { Repository } from "./data/repository.js";
import { AuthService } from "./auth/auth.js";
import type { User } from "./domain/engagement.js";
import { Store } from "./store/jsonStore.js";
import { DiscoveryService } from "./services/discovery.js";
import { RecommendationService } from "./services/recommendations.js";
import { ReviewService } from "./services/reviews.js";
import { AiRecommendationService } from "./services/aiRecommendations.js";
import { CrowdEstimationService } from "./services/crowdEstimation.js";
import { EventService } from "./services/events.js";
import { CompositeVenueOverlay, SponsorshipService } from "./services/sponsorship.js";

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
  sponsorship: SponsorshipService;
}

export function buildContainer(env: ApiEnv, repo: Repository): Container {
  const store = new Store(env.dataDir);
  const auth = new AuthService(store.collection<User>("users"));
  const reviews = new ReviewService(store);
  const events = new EventService(store);
  const sponsorship = new SponsorshipService(store);
  // Reviews set the rating-based score; sponsorship then boosts featured venues.
  const venueOverlay = new CompositeVenueOverlay([reviews, sponsorship]);
  const recommendations = new RecommendationService(repo, venueOverlay);

  return {
    env,
    repo,
    store,
    auth,
    reviews,
    discovery: new DiscoveryService(repo, venueOverlay, events),
    recommendations,
    aiRecommendations: new AiRecommendationService(recommendations, env),
    crowdEstimation: new CrowdEstimationService(repo, store),
    events,
    sponsorship,
  };
}
