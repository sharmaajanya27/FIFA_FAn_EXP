/**
 * Publish target contract. The pipeline writes canonical entities through this
 * interface so we can swap local files (JSONL/Excel) for Aurora + PostGIS or
 * DynamoDB later with zero changes to scraping/normalization code (PRD §5.3.7).
 */
import type { Event, Match, Venue } from "../models/canonical.js";

export interface PublishContext {
  /** City slug being published, e.g. "jersey-city". */
  citySlug: string;
}

export interface Publisher {
  readonly id: string;
  publishVenues(venues: Venue[], ctx: PublishContext): Promise<void>;
  publishMatches(matches: Match[], ctx: PublishContext): Promise<void>;
  publishEvents(events: Event[], ctx: PublishContext): Promise<void>;
}
