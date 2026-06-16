/**
 * Security utilities for the FanWatch frontend.
 */

/** Validate that a URL is safe to render as an href (http or https only). */
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Max allowed photo upload size in bytes (2 MB). */
export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

/** Input length constraints. */
export const LIMITS = {
  displayName: 100,
  email: 254,
  reviewComment: 1000,
  communityPost: 500,
  eventTitle: 200,
  businessName: 200,
  checkInNote: 300,
  photoCaption: 200,
} as const;

/** Truncate a string to the given max length. */
export function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Simple client-side rate limiter. Returns true if the action should be
 * blocked (too many calls within the window).
 */
const actionTimestamps = new Map<string, number[]>();

export function isRateLimited(
  action: string,
  maxCalls = 5,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const timestamps = actionTimestamps.get(action) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxCalls) return true;
  recent.push(now);
  actionTimestamps.set(action, recent);
  return false;
}
