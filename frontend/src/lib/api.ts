/** Typed client for the FanWatch discovery + engagement API. */
import type {
  AdminBusinessSummary,
  AiRecommendation,
  AnalyticsRange,
  AnalyticsSummary,
  BusinessListing,
  CheckIn,
  CommunityPost,
  CrowdEstimate,
  CrowdLevel,
  CrowdStatus,
  EventDetailResponse,
  EventReview,
  EventReviewSummary,
  EventsResponse,
  EventVibe,
  EventVibesResponse,
  FanEvent,
  GeocodeResult,
  LeaderboardEntry,
  LiveEventsResponse,
  NearbyVenuesResponse,
  PageViewPayload,
  Photo,
  Prediction,
  Recommendation,
  Review,
  RsvpSummary,
  PresenceSummary,
  VenueFanReview,
  VenueReviewSummary,
  VenueVibe,
  VenueVibesResponse,
  VenueListing,
} from "./types";
import { getSupabaseToken } from "./supabase";

// Server-side (build/SSR): use BACKEND_URL directly (full URL needed for new URL())
// Client-side (browser): use "/_api" prefix (rewrite proxy, avoids mixed content)
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Browser: always go through the proxy
    return "/_api";
  }
  // Server: need a full URL for fetch during SSG/SSR
  return process.env.BACKEND_URL || "http://localhost:3001";
}

async function request<T>(
  method: string,
  path: string,
  opts: {
    params?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  const base = getBaseUrl();
  const fullPath = base + path;
  const url = base.startsWith("http")
    ? new URL(fullPath)
    : new URL(fullPath, window.location.origin);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  // Supabase anonymous JWT — proves the request comes from our app.
  const anonToken = await getSupabaseToken();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(anonToken ? { "X-Supabase-Auth": anonToken } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      (detail as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(
  path: string,
  params?: Record<string, string | number | undefined>,
) => request<T>("GET", path, { params });

export interface NearbyArgs {
  city: string;
  lat: number;
  lon: number;
  radius: number;
  team?: string;
  kind?: string;
  limit?: number;
}

export const api = {
  // ---- discovery ----
  cities: () => get<{ cities: string[] }>("/cities"),
  nearbyVenues: (a: NearbyArgs) =>
    get<NearbyVenuesResponse>("/venues/nearby", { ...a }),
  nearbyEvents: (a: {
    city: string;
    lat: number;
    lon: number;
    radius: number;
    team?: string;
  }) => get<EventsResponse>("/events/nearby", { ...a }),

  // ---- fan-event engagement (v1, anonymous) ----
  /** Event detail + RSVP/review summaries. Pass anonId to learn "am I going". */
  getEvent: (id: string, anonId?: string) =>
    get<EventDetailResponse>(`/events/${id}`, { anonId }),
  rsvpEvent: (
    id: string,
    anonId: string,
    opts: { going?: boolean; favoriteTeam?: string } = {},
  ) =>
    request<RsvpSummary>("POST", `/events/${id}/rsvp`, {
      body: { anonId, ...opts },
    }),
  listEventVibes: (id: string) =>
    get<EventVibesResponse>(`/events/${id}/vibes`),
  postEventVibe: (
    id: string,
    anonId: string,
    intensity: number,
    favoriteTeam?: string,
  ) =>
    request<EventVibe>("POST", `/events/${id}/vibes`, {
      body: { anonId, intensity, favoriteTeam },
    }),
  listEventReviews: (id: string) =>
    get<EventReviewSummary>(`/events/${id}/reviews`),
  reviewEvent: (
    id: string,
    anonId: string,
    rating: number,
    opts: { comment?: string; favoriteTeam?: string } = {},
  ) =>
    request<EventReview>("POST", `/events/${id}/reviews`, {
      body: { anonId, rating, ...opts },
    }),

  // ---- watch-spot (venue) engagement (v1, anonymous) ----
  getVenuePresence: (venueId: string, anonId?: string) =>
    get<PresenceSummary>(`/venues/${venueId}/presence`, { anonId }),
  setVenuePresence: (
    venueId: string,
    anonId: string,
    opts: { here?: boolean; favoriteTeam?: string } = {},
  ) =>
    request<PresenceSummary>("POST", `/venues/${venueId}/presence`, {
      body: { anonId, ...opts },
    }),
  listVenueVibes: (venueId: string) =>
    get<VenueVibesResponse>(`/venues/${venueId}/vibes`),
  postVenueVibe: (
    venueId: string,
    anonId: string,
    intensity: number,
    favoriteTeam?: string,
  ) =>
    request<VenueVibe>("POST", `/venues/${venueId}/vibes`, {
      body: { anonId, intensity, favoriteTeam },
    }),
  listVenueFanReviews: (venueId: string) =>
    get<VenueReviewSummary>(`/venues/${venueId}/fan-reviews`),
  reviewVenue: (
    venueId: string,
    anonId: string,
    rating: number,
    opts: { comment?: string; favoriteTeam?: string } = {},
  ) =>
    request<VenueFanReview>("POST", `/venues/${venueId}/fan-reviews`, {
      body: { anonId, rating, ...opts },
    }),
  recommendations: (a: {
    city: string;
    lat: number;
    lon: number;
    team: string;
    radius: number;
    limit?: number;
  }) => get<Recommendation>("/recommendations", { ...a }),
  matches: (city: string, team?: string) =>
    get<{ count: number; matches: import("./types").Match[] }>("/matches", {
      city,
      team,
    }),
  /** Resolve a zip code / neighborhood / address to a point (PRD §6.1). */
  geocode: (q: string, city?: string) =>
    get<GeocodeResult>("/geocode", { q, city }),

  // ---- reviews ----
  listReviews: (venueId: string) =>
    get<{
      venueId: string;
      count: number;
      averageRating: number | null;
      reviews: Review[];
    }>(`/venues/${venueId}/reviews`),
  addReview: (venueId: string, rating: number, comment?: string) =>
    request<Review>("POST", `/venues/${venueId}/reviews`, {
      body: { rating, comment },
    }),

  // ---- check-ins ----
  listCheckIns: (venueId: string) =>
    get<{ count: number; checkins: CheckIn[] }>(`/venues/${venueId}/checkins`),
  checkIn: (venueId: string, note?: string) =>
    request<CheckIn>("POST", `/venues/${venueId}/checkins`, { body: { note } }),

  // ---- predictions ----
  listMatchPredictions: (matchId: string) =>
    get<{ count: number; predictions: Prediction[] }>(
      `/matches/${matchId}/predictions`,
    ),
  predict: (matchId: string, homeScore: number, awayScore: number) =>
    request<Prediction>("POST", `/matches/${matchId}/predictions`, {
      body: { homeScore, awayScore },
    }),
  myPredictions: () =>
    get<{ count: number; predictions: Prediction[] }>("/me/predictions"),
  leaderboard: () =>
    get<{ leaderboard: LeaderboardEntry[] }>("/predictions/leaderboard"),

  // ---- communities ----
  feed: (team: string) =>
    get<{ team: string; count: number; posts: CommunityPost[] }>(
      `/communities/${team}/posts`,
    ),
  post: (team: string, text: string) =>
    request<CommunityPost>("POST", `/communities/${team}/posts`, {
      body: { text },
    }),
  likePost: (postId: string) =>
    request<CommunityPost>("POST", `/posts/${postId}/like`, {}),

  // ---- crowd ----
  crowdStatus: (venueId: string) =>
    get<CrowdStatus>(`/venues/${venueId}/crowd`),
  reportCrowd: (venueId: string, level: CrowdLevel) =>
    request("POST", `/venues/${venueId}/crowd`, { body: { level } }),

  // ---- photos ----
  listPhotos: (venueId: string) =>
    get<{ count: number; photos: Photo[] }>(`/venues/${venueId}/photos`),
  uploadPhoto: (venueId: string, dataUrl: string, caption?: string) =>
    request<Photo>("POST", `/venues/${venueId}/photos`, {
      body: { dataUrl, caption },
    }),

  // ---- Phase 3 ----
  aiRecommendations: (a: {
    city: string;
    lat: number;
    lon: number;
    team: string;
    radius: number;
    mode?: "smart" | "ai";
  }) => get<AiRecommendation>("/ai/recommendations", { ...a }),
  crowdEstimate: (venueId: string, city: string) =>
    get<CrowdEstimate>(`/venues/${venueId}/crowd/estimate`, { city }),
  createEvent: (body: {
    city: string;
    title: string;
    lat: number;
    lon: number;
    startTime: string;
    kind?: string;
    teams?: string[];
    estAttendance?: number;
    matchId?: string;
  }) => request<FanEvent>("POST", "/events", { body }),
  venueListing: (venueId: string) =>
    get<VenueListing>(`/venues/${venueId}/listing`),
  claimVenue: (venueId: string, businessName: string) =>
    request<{ id: string }>("POST", `/venues/${venueId}/claim`, {
      body: { businessName },
    }),
  featureVenue: (venueId: string, pkg: string, days?: number) =>
    request<{ id: string }>("POST", `/venues/${venueId}/feature`, {
      body: { package: pkg, days },
    }),

  // ---- business accounts (PRD §8) ----
  createBusinessListing: (body: {
    name: string;
    city: string;
    lat: number;
    lon: number;
    kind?: string;
    address?: string;
    website?: string;
    phone?: string;
    country?: string;
    supportsTeams?: string[];
    capacity?: number;
  }) => request<BusinessListing>("POST", "/business/listings", { body }),
  myBusinessListings: () =>
    get<{ count: number; listings: BusinessListing[] }>(
      "/business/listings/mine",
    ),
  /** Admin-only review of all business listings + events. */
  adminBusiness: () => get<AdminBusinessSummary>("/admin/business"),

  // ---- traffic analytics ----
  /** Fire-and-forget pageview beacon (public, no auth). */
  recordPageView: (payload: PageViewPayload) =>
    request<{ ok: boolean }>("POST", "/analytics/pageview", { body: payload }),
  /** Admin-only traffic summary (requires an admin bearer token). */
  analyticsSummary: (range: AnalyticsRange) =>
    get<AnalyticsSummary>("/analytics/summary", { range }),

  // ---- live sporting events (ESPN-backed, public) ----
  liveEvents: () => get<LiveEventsResponse>("/live/events"),
};
