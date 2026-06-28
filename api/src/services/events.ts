/**
 * User/organizer event creation (PRD §11 Phase 3).
 *
 * Authenticated users create fan events that are stored in the write store and
 * merged into discovery alongside the Phase 0 seed events. Implements the
 * DiscoveryService event-overlay contract via `forCity`.
 */
import type { Event } from "../domain/models.js";
import type { User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";
import { geohash } from "../util/geo.js";

/** Stored shape: canonical Event plus provenance. */
export interface UserEvent extends Event {
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateEventInput {
  city: string;
  country?: string;
  title: string;
  kind?: Event["kind"];
  lat: number;
  lon: number;
  startTime: string;
  venueId?: string;
  matchId?: string;
  teams?: string[];
  estAttendance?: number;
}

export class EventService {
  constructor(private readonly store: Store) {}
  private get events() {
    return this.store.collection<UserEvent>("user_events");
  }

  async create(user: User, input: CreateEventInput): Promise<UserEvent> {
    const geo = { lat: input.lat, lon: input.lon };
    return this.events.insert({
      title: input.title.trim(),
      kind: input.kind ?? "viewing_party",
      geo,
      geohash: geohash(geo),
      startTime: input.startTime,
      city: input.city,
      country: input.country,
      venueId: input.venueId,
      matchId: input.matchId,
      teams: input.teams ?? [],
      estAttendance: input.estAttendance,
      createdBy: user.id,
      createdByName: user.displayName,
      createdAt: new Date().toISOString(),
    });
  }

  /** Events created for a city — the DiscoveryService overlay source. */
  async forCity(city: string): Promise<Event[]> {
    return this.events.find((e) => e.city === city || e.city === undefined);
  }

  /** A single user-created event by id (event detail page). */
  async byId(id: string): Promise<UserEvent | undefined> {
    return this.events.findOne((e) => e.id === id);
  }

  async listForCity(city: string): Promise<UserEvent[]> {
    return (await this.events.find((e) => e.city === city)).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }

  /** Every user/business event — the admin review surface. */
  async all(): Promise<UserEvent[]> {
    return (await this.events.all()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
