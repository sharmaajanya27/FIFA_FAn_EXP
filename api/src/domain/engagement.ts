/**
 * Phase 2 engagement entities (user-generated). These are written via the API
 * (unlike the read-only Phase 0/1 models) and persisted in the write store.
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  favoriteTeams: string[];
  homeCity?: string;
  bio?: string;
  createdAt: string;
}

/** Public-safe view of a user (no email). */
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
  rating: number; // 1..5
  comment?: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  venueId: string;
  eventId?: string;
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

export interface CrowdReport {
  id: string;
  venueId: string;
  userId: string;
  level: CrowdLevel;
  createdAt: string;
}

export interface Photo {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  /** Data URL (dev). Swap for an S3 object URL in production. */
  dataUrl: string;
  caption?: string;
  createdAt: string;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    displayName: u.displayName,
    favoriteTeams: u.favoriteTeams,
    homeCity: u.homeCity,
    bio: u.bio,
    createdAt: u.createdAt,
  };
}
