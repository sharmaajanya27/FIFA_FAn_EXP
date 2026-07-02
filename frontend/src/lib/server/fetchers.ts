/**
 * Server-only data fetchers for the SEO landing pages. These run in React
 * Server Components / generateMetadata / sitemap — never in the browser — and
 * use Next's fetch cache (ISR: revalidate hourly) so pages are static-fast and
 * the API isn't hit per request.
 *
 * They mirror endpoints already used by the client `lib/api.ts`, but here the
 * city center (lat/lon) is resolved from `lib/cities.ts` rather than the user's
 * geolocation.
 */
import "server-only";
import { cityBySlug } from "../cities";
import type {
  EventDetailResponse,
  Match,
  PresenceSummary,
  RankedVenue,
  ReviewsResponse,
  VenueDetail,
  VenueReviewSummary,
} from "../types";

// Server-only: always use BACKEND_URL (full http:// URL). Exposed via
// next.config.mjs `env` field to ensure it's available during build.
const BASE = (process.env.BACKEND_URL || "http://localhost:3001").replace(
  /\/+$/,
  "",
);
const SERVER_AUTH_SECRET = process.env.SERVER_AUTH_SECRET || "";
const REVALIDATE_SECONDS = 3600;
/** Wide enough to cover a metro from its center (e.g. SF Bay Area). */
const METRO_RADIUS_M = 25000;

async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T | null> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: SERVER_AUTH_SECRET
        ? {
            // Server-side calls bypass the browser Supabase session. The backend
            // skips JWT verification when SUPABASE_URL is unset; in production we
            // send a service-level bypass header so the JWT gate lets SSG through.
            "X-Server-Auth": SERVER_AUTH_SECRET,
          }
        : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Top ranked venues across a metro, optionally team-boosted. */
export async function getCityVenues(
  slug: string,
  opts: { team?: string; limit?: number } = {},
): Promise<RankedVenue[]> {
  const city = cityBySlug(slug);
  if (!city) return [];
  const data = await apiGet<{ venues: RankedVenue[] }>("/venues/nearby", {
    city: slug,
    lat: city.center.lat,
    lon: city.center.lon,
    radius: METRO_RADIUS_M,
    team: opts.team,
    limit: opts.limit ?? 24,
  });
  return data?.venues ?? [];
}

/** Single venue + its reviews (for rating schema + on-page content). */
export async function getVenueWithReviews(
  citySlug: string,
  id: string,
): Promise<{ venue: VenueDetail; reviews: ReviewsResponse } | null> {
  const venue = await apiGet<VenueDetail>(`/venues/${encodeURIComponent(id)}`, {
    city: citySlug,
  });
  if (!venue?.id) return null;
  const reviews = (await apiGet<ReviewsResponse>(
    `/venues/${encodeURIComponent(id)}/reviews`,
  )) ?? {
    venueId: id,
    count: 0,
    averageRating: null,
    reviews: [],
  };
  return { venue, reviews };
}

/** Single fan event + its RSVP/review summaries (event detail page). */
export async function getEventDetail(
  id: string,
): Promise<EventDetailResponse | null> {
  const data = await apiGet<EventDetailResponse>(
    `/events/${encodeURIComponent(id)}`,
  );
  return data?.event ? data : null;
}

/** A venue's anonymous engagement summaries (presence + reviews) for SSR. */
export async function getVenueEngagement(
  id: string,
): Promise<{ presence: PresenceSummary; reviews: VenueReviewSummary }> {
  const [presence, reviews] = await Promise.all([
    apiGet<PresenceSummary>(`/venues/${encodeURIComponent(id)}/presence`),
    apiGet<VenueReviewSummary>(`/venues/${encodeURIComponent(id)}/fan-reviews`),
  ]);
  return {
    presence: presence ?? { venueId: id, count: 0, teams: {}, here: false },
    reviews: reviews ?? {
      venueId: id,
      count: 0,
      averageRating: null,
      reviews: [],
    },
  };
}

/** Upcoming fixtures for a city, optionally filtered by team code. */
export async function getCityMatches(
  slug: string,
  team?: string,
): Promise<Match[]> {
  const data = await apiGet<{ matches: Match[] }>("/matches", {
    city: slug,
    team,
  });
  return data?.matches ?? [];
}
