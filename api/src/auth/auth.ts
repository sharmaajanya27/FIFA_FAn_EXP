/**
 * Authentication (DEV STUB). Passwordless register/login by email; the bearer
 * token is just the user id with a prefix. This is intentionally minimal so the
 * engagement features have a real "current user" to attach to.
 *
 * Production swap: replace AuthService with Cognito/Auth0/Clerk verification
 * (the rest of the API only depends on `resolveUser(token)` and the handler
 * `requireUser` helper).
 */
import type { Collection } from "../store/jsonStore.js";
import type { User } from "../domain/engagement.js";

const TOKEN_PREFIX = "fmtok_";

export class AuthService {
  constructor(private readonly users: Collection<User>) {}

  private tokenFor(userId: string): string {
    return TOKEN_PREFIX + userId;
  }

  async register(input: {
    email: string;
    displayName: string;
    favoriteTeams?: string[];
    homeCity?: string;
  }): Promise<{ token: string; user: User }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findOne((u) => u.email === email);
    if (existing) {
      // Idempotent for dev: treat as login.
      return { token: this.tokenFor(existing.id), user: existing };
    }
    const user = await this.users.insert({
      email,
      displayName: input.displayName.trim() || email.split("@")[0]!,
      favoriteTeams: input.favoriteTeams ?? [],
      homeCity: input.homeCity,
      createdAt: new Date().toISOString(),
    });
    return { token: this.tokenFor(user.id), user };
  }

  async login(email: string): Promise<{ token: string; user: User } | null> {
    const found = await this.users.findOne(
      (u) => u.email === email.trim().toLowerCase(),
    );
    return found ? { token: this.tokenFor(found.id), user: found } : null;
  }

  /** Resolve a bearer token (or "Bearer <token>" header value) to a user. */
  async resolveUser(authHeader: string | undefined): Promise<User | undefined> {
    if (!authHeader) return undefined;
    const raw = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    if (!raw.startsWith(TOKEN_PREFIX)) return undefined;
    const userId = raw.slice(TOKEN_PREFIX.length);
    return this.users.findOne((u) => u.id === userId);
  }
}
