/**
 * Phase 2 engagement entities (user-generated). These are written via the API
 * (unlike the read-only Phase 0/1 models) and persisted in the write store.
 */
/** "fan" = regular user; "business" = venue owner / organizer (PRD §8). */
export type AccountType = "fan" | "business";

export interface User {
  id: string;
  email: string;
  displayName: string;
  favoriteTeams: string[];
  homeCity?: string;
  bio?: string;
  /** Account type — fans by default; business owners get the §8 surfaces. */
  accountType?: AccountType;
  /** Trading name for business accounts. */
  businessName?: string;
  createdAt: string;
}

/** Public-safe view of a user (no email). */
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

/**
 * Anonymous fan-event participation (v1: no login). Each anonymous fan is
 * identified by a device-scoped `anonId` (a random id persisted in the
 * browser's localStorage), never a user account. One RSVP row per
 * (eventId, anonId): re-RSVPing updates `going`/`favoriteTeam` in place.
 */
export interface EventRsvp {
  id: string;
  eventId: string;
  /** Device-scoped anonymous id (localStorage), not an account. */
  anonId: string;
  /** Whether the fan is currently going (toggled off cancels the RSVP). */
  going: boolean;
  /** Optional team code the attendee is repping. */
  favoriteTeam?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Live "vibe" energy meter — a 0..10 intensity slider (0 = dead, 10 = electric).
 * Replaces free-text vibes with a quick atmosphere reading (text expression
 * lives in reviews).
 */
export const VIBE_MIN = 0;
export const VIBE_MAX = 10;

/** Clamp + round a raw value to an integer intensity in [0, 10]. */
export function clampIntensity(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(VIBE_MIN, Math.min(VIBE_MAX, Math.round(n)));
}

/** Normalize an intensity (0..10) to 0..1 for the buzz term. */
export function vibeEnergyNorm(intensity: number): number {
  return Math.max(0, Math.min(1, intensity / VIBE_MAX));
}

/** The most-common key in a tally (e.g. dominant repped team), or undefined. */
export function dominantKey(tally: Record<string, number>): string | undefined {
  let best: string | undefined;
  let bestN = 0;
  for (const [k, n] of Object.entries(tally)) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

/** A live "vibe" energy pulse during a fan event (anonymous). */
export interface EventVibe {
  id: string;
  eventId: string;
  anonId: string;
  /** Atmosphere energy reading, 0..10 (0 = dead, 10 = electric). */
  intensity: number;
  /** Team the poster reps, denormalized for display. */
  favoriteTeam?: string;
  createdAt: string;
}

/** A post-event review of the atmosphere (anonymous, 1..5). */
export interface EventReview {
  id: string;
  eventId: string;
  anonId: string;
  rating: number; // 1..5
  comment?: string;
  favoriteTeam?: string;
  createdAt: string;
}

/**
 * Anonymous watch-spot (venue) engagement (v1: no login). Mirrors the fan-event
 * model so both surfaces behave identically — a device-scoped `anonId`
 * identifies the fan. A venue is persistent (no kickoff), so all three actions
 * are always available rather than phase-gated.
 */

/** "I'm here" presence at a venue (anonymous). One row per (venueId, anonId). */
export interface VenuePresence {
  id: string;
  venueId: string;
  anonId: string;
  /** Whether the fan is currently here (toggled off clears it). */
  here: boolean;
  favoriteTeam?: string;
  createdAt: string;
  updatedAt: string;
}

/** A live "vibe" energy pulse about a venue's current atmosphere (anonymous). */
export interface VenueVibe {
  id: string;
  venueId: string;
  anonId: string;
  /** Atmosphere energy reading, 0..10 (0 = dead, 10 = electric). */
  intensity: number;
  favoriteTeam?: string;
  createdAt: string;
}

/** An anonymous review of a venue (1..5). One review per device per venue. */
export interface VenueReview {
  id: string;
  venueId: string;
  anonId: string;
  rating: number; // 1..5
  comment?: string;
  favoriteTeam?: string;
  createdAt: string;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    displayName: u.displayName,
    favoriteTeams: u.favoriteTeams,
    homeCity: u.homeCity,
    bio: u.bio,
    accountType: u.accountType ?? "fan",
    businessName: u.businessName,
    createdAt: u.createdAt,
  };
}
