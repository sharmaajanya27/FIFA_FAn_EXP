/**
 * Business venue listings (PRD §8 — premium business accounts).
 *
 * Business-account owners submit their own venue ("watch spot"). Unlike Phase 0
 * venues (read-only, scraped) these are user-submitted and stored in the write
 * store, then merged into discovery via the `VenueSource` contract so they show
 * up in the ranked watch-spots list and on the map alongside ingested venues.
 *
 * The same owners post fan events through the existing EventService; this
 * service plus that one give a business everything the §8 listing flow needs.
 */
import type { GeoPoint, Venue } from "../domain/models.js";
import type { User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";
import type { VenueSource } from "./discovery.js";
import { geohash } from "../util/geo.js";

/** Stored shape: a canonical Venue plus business provenance. */
export interface BusinessVenue extends Venue {
  ownerId: string;
  ownerName: string;
  ownerBusinessName?: string;
  createdAt: string;
}

export interface CreateListingInput {
  name: string;
  kind?: string;
  city: string;
  country?: string;
  lat: number;
  lon: number;
  address?: string;
  website?: string;
  phone?: string;
  supportsTeams?: string[];
  capacity?: number;
}

/** Baseline static score for a fresh business listing (0..1). */
const BASE_SCORE = 0.5;

export class BusinessService implements VenueSource {
  constructor(private readonly store: Store) {}
  private get listings() {
    return this.store.collection<BusinessVenue>("business_venues");
  }

  async createListing(user: User, input: CreateListingInput): Promise<BusinessVenue> {
    const geo: GeoPoint = { lat: input.lat, lon: input.lon };
    return this.listings.insert({
      // Stable, human-readable id namespace so it never collides with OSM ids.
      id: `biz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name.trim(),
      kind: input.kind?.trim() || "bar",
      geo,
      geohash: geohash(geo),
      address: input.address?.trim(),
      city: input.city,
      country: input.country,
      website: input.website?.trim(),
      phone: input.phone?.trim(),
      capacity: input.capacity,
      supportsTeams: input.supportsTeams ?? [],
      showsMatches: 1,
      score: BASE_SCORE,
      claimed: true,
      business: true,
      ownerId: user.id,
      ownerName: user.displayName,
      ownerBusinessName: user.businessName,
      createdAt: new Date().toISOString(),
    });
  }

  /** Business listings for a city — the DiscoveryService venue-source hook. */
  async forCity(city: string): Promise<Venue[]> {
    return this.listings.find((v) => v.city === city);
  }

  /** Listings owned by a given business account (their dashboard). */
  async listByOwner(ownerId: string): Promise<BusinessVenue[]> {
    return (await this.listings.find((v) => v.ownerId === ownerId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** Every listing — the admin review surface. */
  async all(): Promise<BusinessVenue[]> {
    return (await this.listings.all()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
