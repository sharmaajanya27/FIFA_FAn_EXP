/** Venue/event check-ins (PRD §7). */
import type { CheckIn, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

export class CheckInService {
  constructor(private readonly store: Store) {}
  private get checkins() {
    return this.store.collection<CheckIn>("checkins");
  }

  async create(input: {
    venueId: string;
    eventId?: string;
    user: User;
    note?: string;
  }): Promise<CheckIn> {
    return this.checkins.insert({
      venueId: input.venueId,
      eventId: input.eventId,
      userId: input.user.id,
      userName: input.user.displayName,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  private byRecency(a: CheckIn, b: CheckIn) {
    return b.createdAt.localeCompare(a.createdAt);
  }

  async listForVenue(venueId: string): Promise<CheckIn[]> {
    return (await this.checkins.find((c) => c.venueId === venueId)).sort(
      this.byRecency,
    );
  }
  async listForUser(userId: string): Promise<CheckIn[]> {
    return (await this.checkins.find((c) => c.userId === userId)).sort(
      this.byRecency,
    );
  }
}
