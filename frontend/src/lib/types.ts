/** Response shapes from the FanWatch discovery API (Phase 1 backend). */
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface RankedVenue {
  id: string;
  name: string;
  kind: string;
  geo: GeoPoint;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  hours?: string;
  ratingAvg?: number;
  supportsTeams: string[];
  showsMatches?: number;
  score?: number;
  distanceMeters: number;
  finalScore: number;
  featured?: boolean;
  claimed?: boolean;
  /** Anonymous fan rating (avg 1..5) + count, from venue engagement. */
  fanRating?: number;
  fanRatingCount?: number;
  /** Distinct devices currently "here" (live presence). */
  hereCount?: number;
  /** Number of live vibe pulses. */
  vibeCount?: number;
  /** Average crowd-energy intensity (0..10) from recent vibe pulses. */
  energy?: number;
  /** Dominant repped team among fans here. */
  dominantTeam?: string;
}

export interface Match {
  id: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  stage?: string;
}

export interface FanEvent {
  id: string;
  title: string;
  kind: string;
  geo: GeoPoint;
  startTime: string;
  matchId?: string;
  teams: string[];
  estAttendance?: number;
  distanceMeters: number;
  /** Distinct devices currently RSVP'd "going" (anonymous). */
  goingCount?: number;
  /** Number of live vibe pulses. */
  vibeCount?: number;
  /** Average crowd-energy intensity (0..10) from recent vibe pulses. */
  energy?: number;
  /** Dominant repped team among attendees. */
  dominantTeam?: string;
}

export interface NearbyVenuesResponse {
  count: number;
  radiusMeters: number;
  venues: RankedVenue[];
}
export interface EventsResponse {
  count: number;
  events: FanEvent[];
}

// ---- fan-event engagement (v1, anonymous) ----
/** Full fan-event record (event detail page; no per-query distance). */
export interface EventDetail {
  id: string;
  title: string;
  kind: string;
  geo: GeoPoint;
  startTime: string;
  city?: string;
  country?: string;
  venueId?: string;
  matchId?: string;
  teams: string[];
  estAttendance?: number;
}

export interface RsvpSummary {
  eventId: string;
  /** Distinct devices currently going. */
  count: number;
  /** Going-count by repped team code. */
  teams: Record<string, number>;
  /** Whether this device is currently going. */
  going: boolean;
  /** This device's repped team, if any. */
  favoriteTeam?: string;
}

export interface EventVibe {
  id: string;
  eventId: string;
  anonId: string;
  intensity: number;
  favoriteTeam?: string;
  createdAt: string;
}

export interface EventReview {
  id: string;
  eventId: string;
  anonId: string;
  rating: number;
  comment?: string;
  favoriteTeam?: string;
  createdAt: string;
}

export interface EventReviewSummary {
  eventId: string;
  count: number;
  averageRating: number | null;
  reviews: EventReview[];
}

export interface EventDetailResponse {
  event: EventDetail;
  rsvps: RsvpSummary;
  reviews: EventReviewSummary;
}

export interface EventVibesResponse {
  count: number;
  vibes: EventVibe[];
}

// ---- watch-spot (venue) engagement (v1, anonymous) ----
export interface PresenceSummary {
  venueId: string;
  /** Distinct devices currently here. */
  count: number;
  teams: Record<string, number>;
  /** Whether this device is currently here. */
  here: boolean;
  favoriteTeam?: string;
}

export interface VenueVibe {
  id: string;
  venueId: string;
  anonId: string;
  intensity: number;
  favoriteTeam?: string;
  createdAt: string;
}

export interface VenueFanReview {
  id: string;
  venueId: string;
  anonId: string;
  rating: number;
  comment?: string;
  favoriteTeam?: string;
  createdAt: string;
}

export interface VenueReviewSummary {
  venueId: string;
  count: number;
  averageRating: number | null;
  reviews: VenueFanReview[];
}

export interface VenueVibesResponse {
  count: number;
  vibes: VenueVibe[];
}

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
  detail: string;
  clock?: string;
  startTime: string;
  venue?: string;
  home: LiveEventTeam;
  away: LiveEventTeam;
}
export interface LiveEventsResponse {
  count: number;
  events: LiveEvent[];
}
export interface Recommendation {
  team: string;
  city: string;
  topVenues: RankedVenue[];
  upcomingMatches: Match[];
  rationale: string;
}

// ---- Phase 2 engagement ----
export type AccountType = "fan" | "business";

export interface PublicUser {
  id: string;
  displayName: string;
  favoriteTeams: string[];
  homeCity?: string;
  bio?: string;
  accountType?: AccountType;
  businessName?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  note?: string;
  createdAt: string;
}

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  predictions: number;
  points: number;
}

export interface CommunityPost {
  id: string;
  team: string;
  userId: string;
  userName: string;
  text: string;
  likedBy: string[];
  createdAt: string;
}

export type CrowdLevel = "empty" | "quiet" | "lively" | "packed";
export interface CrowdStatus {
  venueId: string;
  level: CrowdLevel | null;
  recentReports: number;
  updatedAt: string | null;
}

export interface Photo {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  dataUrl: string;
  caption?: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

// ---- Phase 3 ----
export interface AiRecommendation extends Recommendation {
  mode: "smart" | "ai";
  aiSummary: string;
  aiStatus: "available" | "coming_soon";
  message?: string;
}

export type CrowdLevelValue = "empty" | "quiet" | "lively" | "packed";
export interface CrowdEstimate {
  venueId: string;
  level: CrowdLevelValue;
  source: "reported" | "estimated";
  confidence: number;
  signals: {
    recentReports: number;
    recentCheckIns: number;
    minutesToKickoff: number | null;
    capacity: number | null;
  };
}

export interface VenueListing {
  venueId: string;
  claimed: boolean;
  businessName?: string;
  featured: boolean;
  featuredUntil?: string;
  package?: string;
}

// ---- Business accounts (PRD §8) ----
/** A zip/neighborhood/address resolved to a point. */
export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
  kind?: string;
}

/** A business-submitted venue listing (shows up in watch spots). */
export interface BusinessListing {
  id: string;
  name: string;
  kind: string;
  geo: GeoPoint;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  phone?: string;
  capacity?: number;
  supportsTeams: string[];
  business?: boolean;
  claimed?: boolean;
  ownerId: string;
  ownerName: string;
  ownerBusinessName?: string;
  createdAt: string;
}

/** A user/business-created fan event, with provenance (admin view). */
export interface CreatedEvent {
  id: string;
  title: string;
  kind: string;
  geo: GeoPoint;
  startTime: string;
  city?: string;
  teams: string[];
  estAttendance?: number;
  matchId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AdminBusinessSummary {
  listings: BusinessListing[];
  events: CreatedEvent[];
  counts: { listings: number; events: number };
}

// ---- SEO (server-rendered landing pages) ----
/** A venue as returned by GET /venues/:id (no query-time distance/score). */
export interface VenueDetail {
  id: string;
  name: string;
  kind: string;
  geo: GeoPoint;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  website?: string;
  hours?: string;
  ratingAvg?: number;
  capacity?: number;
  supportsTeams: string[];
  showsMatches?: number;
  score?: number;
  featured?: boolean;
  claimed?: boolean;
}

export interface ReviewsResponse {
  venueId: string;
  count: number;
  averageRating: number | null;
  reviews: Review[];
}

// ---- Traffic analytics (admin dashboard) ----
export type AnalyticsRange = "today" | "7d" | "30d";

export interface PageContext {
  type: "city" | "team" | "venue" | "home" | "other";
  city?: string;
  team?: string;
  venueId?: string;
}

export interface PageViewPayload {
  path: string;
  sessionId: string;
  referrerHost?: string;
  context?: PageContext;
  utm?: { source?: string; medium?: string; campaign?: string };
}

export interface AnalyticsCountEntry {
  key: string;
  count: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  views: number;
  sessions: number;
}

export interface AnalyticsSummary {
  rangeDays: number;
  generatedAt: string;
  totalViews: number;
  uniqueSessions: number;
  topPaths: AnalyticsCountEntry[];
  topCities: AnalyticsCountEntry[];
  topTeams: AnalyticsCountEntry[];
  topVenues: AnalyticsCountEntry[];
  topReferrers: AnalyticsCountEntry[];
  topSources: AnalyticsCountEntry[];
  daily: AnalyticsDailyPoint[];
}
