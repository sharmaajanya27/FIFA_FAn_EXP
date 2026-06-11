/** Fan profiles (PRD §7). Reads/updates user records in the write store. */
import type { Store } from "../store/jsonStore.js";
import {
  type PublicUser,
  type User,
  toPublicUser,
} from "../domain/engagement.js";

export interface ProfilePatch {
  displayName?: string;
  favoriteTeams?: string[];
  homeCity?: string;
  bio?: string;
}

export class ProfileService {
  constructor(private readonly store: Store) {}
  private get users() {
    return this.store.collection<User>("users");
  }

  async getPublic(userId: string): Promise<PublicUser | undefined> {
    const u = await this.users.findOne((x) => x.id === userId);
    return u ? toPublicUser(u) : undefined;
  }

  async update(userId: string, patch: ProfilePatch): Promise<PublicUser | undefined> {
    const clean: Partial<User> = {};
    if (patch.displayName !== undefined) clean.displayName = patch.displayName.trim();
    if (patch.favoriteTeams !== undefined) clean.favoriteTeams = patch.favoriteTeams;
    if (patch.homeCity !== undefined) clean.homeCity = patch.homeCity;
    if (patch.bio !== undefined) clean.bio = patch.bio;
    const updated = await this.users.update(userId, clean);
    return updated ? toPublicUser(updated) : undefined;
  }
}
