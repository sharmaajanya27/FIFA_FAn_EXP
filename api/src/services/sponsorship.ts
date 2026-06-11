/**
 * Sponsorship marketplace (PRD §8 + §11 Phase 3).
 *
 * Businesses claim a venue and buy a featured (sponsored) placement. Featured
 * venues get a ranking boost and a badge; the boost is applied via the
 * DiscoveryService venue overlay so it flows through the §6.5 ranking. Covers
 * the §8 business model (sponsored venues / featured listings).
 */
import type { Venue } from "../domain/models.js";
import type { User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";
import type { VenueOverlay } from "./discovery.js";
import { log } from "../util/logger.js";

/** Ranking boost added to a featured venue's static score (0..1). */
const FEATURE_BOOST = 0.2;

export interface VenueClaim {
  id: string;
  venueId: string;
  userId: string;
  businessName: string;
  createdAt: string;
}

export interface VenueFeature {
  id: string;
  venueId: string;
  userId: string;
  package: string;
  createdAt: string;
  /** ISO expiry; placement is active while now < until. */
  until: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class SponsorshipService implements VenueOverlay {
  constructor(private readonly store: Store) {}
  private get claims() {
    return this.store.collection<VenueClaim>("venue_claims");
  }
  private get features() {
    return this.store.collection<VenueFeature>("venue_features");
  }

  async claim(input: {
    venueId: string;
    user: User;
    businessName: string;
  }): Promise<VenueClaim> {
    const existing = await this.claims.findOne((cl) => cl.venueId === input.venueId);
    if (existing) return existing; // first claim wins (dev)
    return this.claims.insert({
      venueId: input.venueId,
      userId: input.user.id,
      businessName: input.businessName.trim(),
      createdAt: new Date().toISOString(),
    });
  }

  async feature(input: {
    venueId: string;
    user: User;
    package: string;
    days?: number;
  }): Promise<VenueFeature> {
    const days = Math.max(1, input.days ?? 30);
    return this.features.insert({
      venueId: input.venueId,
      userId: input.user.id,
      package: input.package,
      createdAt: new Date().toISOString(),
      until: new Date(Date.now() + days * DAY_MS).toISOString(),
    });
  }

  async listing(venueId: string): Promise<{
    venueId: string;
    claimed: boolean;
    businessName?: string;
    featured: boolean;
    featuredUntil?: string;
    package?: string;
  }> {
    const claim = await this.claims.findOne((cl) => cl.venueId === venueId);
    const feat = await this.activeFeatureFor(venueId);
    return {
      venueId,
      claimed: !!claim,
      businessName: claim?.businessName,
      featured: !!feat,
      featuredUntil: feat?.until,
      package: feat?.package,
    };
  }

  private async activeFeatureFor(venueId: string): Promise<VenueFeature | undefined> {
    const now = Date.now();
    const active = (await this.features.find((f) => f.venueId === venueId)).filter(
      (f) => new Date(f.until).getTime() > now,
    );
    return active.sort((a, b) => b.until.localeCompare(a.until))[0];
  }

  /** Set of venue ids with an active featured placement. */
  private async activeFeatureIds(): Promise<Set<string>> {
    const now = Date.now();
    const ids = (await this.features.all())
      .filter((f) => new Date(f.until).getTime() > now)
      .map((f) => f.venueId);
    return new Set(ids);
  }

  /** Venue overlay: flag claimed/featured venues and boost featured scores. */
  async applyOverlay(venues: Venue[]): Promise<Venue[]> {
    const [featured, claims] = await Promise.all([
      this.activeFeatureIds(),
      this.claims.all(),
    ]);
    if (featured.size === 0 && claims.length === 0) return venues;
    const claimedIds = new Set(claims.map((c) => c.venueId));
    let boosted = 0;
    const out = venues.map((v) => {
      const isFeatured = featured.has(v.id);
      if (isFeatured) boosted++;
      return {
        ...v,
        claimed: claimedIds.has(v.id) || undefined,
        featured: isFeatured || undefined,
        score: isFeatured ? Math.min(1, (v.score ?? 0) + FEATURE_BOOST) : v.score,
      };
    });
    if (boosted > 0) log.info("sponsorship: featured venues boosted", { boosted });
    return out;
  }
}

/** Run several venue overlays in sequence (e.g. reviews → sponsorship). */
export class CompositeVenueOverlay implements VenueOverlay {
  constructor(private readonly overlays: VenueOverlay[]) {}
  async applyOverlay(venues: Venue[]): Promise<Venue[]> {
    let current = venues;
    for (const o of this.overlays) current = await o.applyOverlay(current);
    return current;
  }
}
