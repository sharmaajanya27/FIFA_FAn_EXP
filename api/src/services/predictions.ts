/**
 * Match predictions + leaderboard (PRD §7). One prediction per user per match
 * (re-predicting updates it). The leaderboard ranks fans by participation now;
 * once fixtures carry final scores, the same structure scores accuracy
 * (exact-score / correct-outcome points) — noted where that plugs in.
 */
import type { Prediction, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  predictions: number;
  points: number;
}

export class PredictionService {
  constructor(private readonly store: Store) {}
  private get predictions() {
    return this.store.collection<Prediction>("predictions");
  }

  async predict(input: {
    matchId: string;
    user: User;
    homeScore: number;
    awayScore: number;
  }): Promise<Prediction> {
    const homeScore = Math.max(0, Math.round(input.homeScore));
    const awayScore = Math.max(0, Math.round(input.awayScore));
    const existing = await this.predictions.findOne(
      (p) => p.matchId === input.matchId && p.userId === input.user.id,
    );
    if (existing) {
      return (await this.predictions.update(existing.id, {
        homeScore,
        awayScore,
        createdAt: new Date().toISOString(),
      }))!;
    }
    return this.predictions.insert({
      matchId: input.matchId,
      userId: input.user.id,
      userName: input.user.displayName,
      homeScore,
      awayScore,
      createdAt: new Date().toISOString(),
    });
  }

  async listForMatch(matchId: string): Promise<Prediction[]> {
    return (await this.predictions.find((p) => p.matchId === matchId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async listForUser(userId: string): Promise<Prediction[]> {
    return (await this.predictions.find((p) => p.userId === userId)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** Leaderboard by participation (points := predictions until results exist). */
  async leaderboard(): Promise<LeaderboardEntry[]> {
    const all = await this.predictions.all();
    const map = new Map<string, LeaderboardEntry>();
    for (const p of all) {
      const e =
        map.get(p.userId) ??
        { userId: p.userId, userName: p.userName, predictions: 0, points: 0 };
      e.predictions += 1;
      e.points += 1; // placeholder scoring; swap for accuracy when results land
      map.set(p.userId, e);
    }
    return [...map.values()].sort((a, b) => b.points - a.points);
  }
}
