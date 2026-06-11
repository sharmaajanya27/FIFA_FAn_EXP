/** Response shapes from the FanMatch discovery API (Phase 1 backend). */
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
  score?: number;
  distanceMeters: number;
  finalScore: number;
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
