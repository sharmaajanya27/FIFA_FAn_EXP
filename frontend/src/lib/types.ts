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
