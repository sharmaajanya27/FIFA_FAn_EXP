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
export interface Recommendation {
  team: string;
  city: string;
  topVenues: RankedVenue[];
  upcomingMatches: Match[];
  rationale: string;
}

// ---- Phase 2 engagement ----
export interface PublicUser {
  id: string;
  displayName: string;
  favoriteTeams: string[];
  homeCity?: string;
  bio?: string;
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
