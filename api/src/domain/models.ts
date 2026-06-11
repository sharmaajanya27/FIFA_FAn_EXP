/**
 * Read-side domain models. These mirror the canonical JSONL that the Phase 0
 * ingestion pipeline publishes (the data contract). The API is a separate
 * service, so it keeps its own lightweight read types rather than importing the
 * ingestion package — the JSONL shape is the contract between them.
 */
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Venue {
  id: string;
  name: string;
  kind: string;
  geo: GeoPoint;
  geohash: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  website?: string;
  hours?: string;
  ratingAvg?: number;
  capacity?: number;
  supportsTeams: string[];
  engagement?: number;
  /** Likelihood (0..1) that this venue shows live matches (sports bar / pub signals). */
  showsMatches?: number;
  /** Precomputed static ranking score (0..1) from Phase 0. */
  score?: number;
  /** True when a business has an active featured (sponsored) placement. */
  featured?: boolean;
  /** True when a business has claimed this venue. */
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

export interface Event {
  id: string;
  title: string;
  kind: string;
  geo: GeoPoint;
  geohash: string;
  startTime: string;
  city?: string;
  country?: string;
  venueId?: string;
  matchId?: string;
  teams: string[];
  estAttendance?: number;
}

/** A venue annotated with query-time results (distance + final score). */
export interface RankedVenue extends Venue {
  distanceMeters: number;
  /** Final ranking score (0..1) combining static + query-time signals. */
  finalScore: number;
}
