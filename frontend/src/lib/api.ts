/** Typed client for the FanMatch discovery + engagement API. */
import type {
  AiRecommendation,
  AuthResult,
  CheckIn,
  CommunityPost,
  CrowdEstimate,
  CrowdLevel,
  CrowdStatus,
  EventsResponse,
  FanEvent,
  LeaderboardEntry,
  NearbyVenuesResponse,
  Photo,
  Prediction,
  PublicUser,
  Recommendation,
  Review,
  VenueListing,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3001";

const TOKEN_KEY = "fanmatch_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  method: string,
  path: string,
  opts: { params?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const token = getToken();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, params?: Record<string, string | number | undefined>) =>
  request<T>("GET", path, { params });

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
  nearbyEvents: (a: { city: string; lat: number; lon: number; radius: number; team?: string }) =>
    get<EventsResponse>("/events/nearby", { ...a }),
  recommendations: (a: { city: string; lat: number; lon: number; team: string; radius: number; limit?: number }) =>
    get<Recommendation>("/recommendations", { ...a }),
  matches: (city: string, team?: string) =>
    get<{ count: number; matches: import("./types").Match[] }>("/matches", { city, team }),

  // ---- auth + profile ----
  register: (body: { email: string; displayName: string; favoriteTeams?: string[]; homeCity?: string }) =>
    request<AuthResult>("POST", "/auth/register", { body }),
  login: (email: string) => request<AuthResult>("POST", "/auth/login", { body: { email } }),
  me: () => get<{ user: PublicUser }>("/me"),
  updateProfile: (body: Partial<Pick<PublicUser, "displayName" | "favoriteTeams" | "homeCity" | "bio">>) =>
    request<PublicUser>("PUT", "/me/profile", { body }),
  userCheckIns: (userId: string) =>
    get<{ count: number; checkins: CheckIn[] }>(`/users/${userId}/checkins`),

  // ---- reviews ----
  listReviews: (venueId: string) =>
    get<{ venueId: string; count: number; averageRating: number | null; reviews: Review[] }>(`/venues/${venueId}/reviews`),
  addReview: (venueId: string, rating: number, comment?: string) =>
    request<Review>("POST", `/venues/${venueId}/reviews`, { body: { rating, comment } }),

  // ---- check-ins ----
  listCheckIns: (venueId: string) =>
    get<{ count: number; checkins: CheckIn[] }>(`/venues/${venueId}/checkins`),
  checkIn: (venueId: string, note?: string) =>
    request<CheckIn>("POST", `/venues/${venueId}/checkins`, { body: { note } }),

  // ---- predictions ----
  listMatchPredictions: (matchId: string) =>
    get<{ count: number; predictions: Prediction[] }>(`/matches/${matchId}/predictions`),
  predict: (matchId: string, homeScore: number, awayScore: number) =>
    request<Prediction>("POST", `/matches/${matchId}/predictions`, { body: { homeScore, awayScore } }),
  myPredictions: () => get<{ count: number; predictions: Prediction[] }>("/me/predictions"),
  leaderboard: () => get<{ leaderboard: LeaderboardEntry[] }>("/predictions/leaderboard"),

  // ---- communities ----
  feed: (team: string) =>
    get<{ team: string; count: number; posts: CommunityPost[] }>(`/communities/${team}/posts`),
  post: (team: string, text: string) =>
    request<CommunityPost>("POST", `/communities/${team}/posts`, { body: { text } }),
  likePost: (postId: string) => request<CommunityPost>("POST", `/posts/${postId}/like`, {}),

  // ---- crowd ----
  crowdStatus: (venueId: string) => get<CrowdStatus>(`/venues/${venueId}/crowd`),
  reportCrowd: (venueId: string, level: CrowdLevel) =>
    request("POST", `/venues/${venueId}/crowd`, { body: { level } }),

  // ---- photos ----
  listPhotos: (venueId: string) =>
    get<{ count: number; photos: Photo[] }>(`/venues/${venueId}/photos`),
  uploadPhoto: (venueId: string, dataUrl: string, caption?: string) =>
    request<Photo>("POST", `/venues/${venueId}/photos`, { body: { dataUrl, caption } }),

  // ---- Phase 3 ----
  aiRecommendations: (a: { city: string; lat: number; lon: number; team: string; radius: number; mode?: "smart" | "ai" }) =>
    get<AiRecommendation>("/ai/recommendations", { ...a }),
  crowdEstimate: (venueId: string, city: string) =>
    get<CrowdEstimate>(`/venues/${venueId}/crowd/estimate`, { city }),
  createEvent: (body: {
    city: string; title: string; lat: number; lon: number; startTime: string;
    kind?: string; teams?: string[]; estAttendance?: number; matchId?: string;
  }) => request<FanEvent>("POST", "/events", { body }),
  venueListing: (venueId: string) => get<VenueListing>(`/venues/${venueId}/listing`),
  claimVenue: (venueId: string, businessName: string) =>
    request<{ id: string }>("POST", `/venues/${venueId}/claim`, { body: { businessName } }),
  featureVenue: (venueId: string, pkg: string, days?: number) =>
    request<{ id: string }>("POST", `/venues/${venueId}/feature`, { body: { package: pkg, days } }),
};
