/**
 * Venue reviews (PRD §7). Beyond storing reviews, this service overlays the
 * community average rating back onto venues and recomputes their static score,
 * so user reviews actually move the §6.5 ranking — closing the loop between
 * Phase 2 engagement and Phase 1 discovery.
 */
import type { Venue } from "../domain/models.js";
import type { Review, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

export interface RatingAgg {
  avg: number;
  count: number;
}

// Mirrors ingestion scoring.json static weights: ratings is 0.3 of the 0.75
// static total, so a fully-rated venue contributes 0.3/0.75 = 0.4 to the score.
const RATING_SHARE_OF_STATIC = 0.3 / 0.75;

export class ReviewService {
  constructor(private readonly store: Store) {}
  private get reviews() {
    return this.store.collection<Review>("reviews");
  }

  async create(input: {
    venueId: string;
    user: User;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
    return this.reviews.insert({
      venueId: input.venueId,
      userId: input.user.id,
      userName: input.user.displayName,
      rating,
      comment: input.comment?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  async listForVenue(venueId: string): Promise<Review[]> {
    const list = await this.reviews.find((r) => r.venueId === venueId);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Aggregate average rating + count per venue id. */
  async aggregates(): Promise<Map<string, RatingAgg>> {
    const all = await this.reviews.all();
    const sums = new Map<string, { total: number; count: number }>();
    for (const r of all) {
      const cur = sums.get(r.venueId) ?? { total: 0, count: 0 };
      cur.total += r.rating;
      cur.count += 1;
      sums.set(r.venueId, cur);
    }
    const out = new Map<string, RatingAgg>();
    for (const [id, s] of sums) {
      out.set(id, { avg: s.total / s.count, count: s.count });
    }
    return out;
  }

  /**
   * Overlay community ratings onto venues and recompute the static score so
   * reviews feed ranking. Returns new venue objects (does not mutate input).
   */
  async applyOverlay(venues: Venue[]): Promise<Venue[]> {
    const aggs = await this.aggregates();
    if (aggs.size === 0) return venues;
    return venues.map((v) => {
      const agg = aggs.get(v.id);
      if (!agg) return v;
      return {
        ...v,
        ratingAvg: Math.round(agg.avg * 10) / 10,
        score: RATING_SHARE_OF_STATIC * (agg.avg / 5),
      };
    });
  }
}
