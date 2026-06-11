/** Typed client for the FanMatch discovery API. */
import type {
  EventsResponse,
  NearbyVenuesResponse,
  Recommendation,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3001";

async function get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
  cities: () => get<{ cities: string[] }>("/cities", {}),

  nearbyVenues: (a: NearbyArgs) =>
    get<NearbyVenuesResponse>("/venues/nearby", {
      city: a.city,
      lat: a.lat,
      lon: a.lon,
      radius: a.radius,
      team: a.team,
      kind: a.kind,
      limit: a.limit,
    }),

  nearbyEvents: (a: { city: string; lat: number; lon: number; radius: number; team?: string }) =>
    get<EventsResponse>("/events/nearby", a),

  recommendations: (a: { city: string; lat: number; lon: number; team: string; radius: number; limit?: number }) =>
    get<Recommendation>("/recommendations", a),
};
