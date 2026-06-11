/**
 * Live crowd estimation (PRD §11 Phase 3).
 *
 * The Phase 2 CrowdService reports crowds from manual fan submissions. This
 * service *predicts* a crowd level when there are no recent reports, by blending
 * three signals: recent check-ins, venue capacity, and proximity to a kickoff.
 * Reported data, when present, always wins over the estimate.
 */
import type { Repository } from "../data/repository.js";
import type { CheckIn, CrowdLevel, CrowdReport } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

const ORDER: CrowdLevel[] = ["empty", "quiet", "lively", "packed"];
const RECENT_MS = 2 * 60 * 60 * 1000;
const KICKOFF_WINDOW_MS = 3 * 60 * 60 * 1000;

export interface CrowdEstimate {
  venueId: string;
  level: CrowdLevel;
  /** "reported" if based on recent fan reports, else "estimated". */
  source: "reported" | "estimated";
  confidence: number; // 0..1
  signals: {
    recentReports: number;
    recentCheckIns: number;
    minutesToKickoff: number | null;
    capacity: number | null;
  };
}

const clampLevel = (i: number): CrowdLevel => ORDER[Math.max(0, Math.min(3, Math.round(i)))]!;

export class CrowdEstimationService {
  constructor(
    private readonly repo: Repository,
    private readonly store: Store,
  ) {}

  async estimate(city: string, venueId: string): Promise<CrowdEstimate> {
    const now = Date.now();
    const cutoff = now - RECENT_MS;

    const reports = (
      await this.store.collection<CrowdReport>("crowd_reports").find((r) => r.venueId === venueId)
    ).filter((r) => new Date(r.createdAt).getTime() >= cutoff);

    const checkIns = (
      await this.store.collection<CheckIn>("checkins").find((c) => c.venueId === venueId)
    ).filter((c) => new Date(c.createdAt).getTime() >= cutoff);

    const venue = (await this.repo.venues(city)).find((v) => v.id === venueId);
    const capacity = venue?.capacity ?? null;

    // Nearest upcoming kickoff within the window.
    const futureKickoffs = (await this.repo.matches(city))
      .map((m) => new Date(m.kickoff).getTime())
      .filter((t) => t >= now && t - now <= KICKOFF_WINDOW_MS)
      .sort((a, b) => a - b);
    const minutesToKickoff =
      futureKickoffs.length > 0 ? Math.round((futureKickoffs[0]! - now) / 60000) : null;

    // 1) Reported data wins.
    if (reports.length > 0) {
      const avg = reports.reduce((s, r) => s + ORDER.indexOf(r.level), 0) / reports.length;
      return {
        venueId,
        level: clampLevel(avg),
        source: "reported",
        confidence: Math.min(1, 0.6 + 0.1 * reports.length),
        signals: {
          recentReports: reports.length,
          recentCheckIns: checkIns.length,
          minutesToKickoff,
          capacity,
        },
      };
    }

    // 2) Estimate from check-ins, scaled by capacity, boosted near kickoff.
    const denom = capacity ? Math.max(4, capacity / 50) : 6; // check-ins for "packed"
    let score = (checkIns.length / denom) * 3; // 0..3
    if (minutesToKickoff !== null) {
      // +1 level just before kickoff, fading across the 3h window.
      score += 1 - minutesToKickoff / (KICKOFF_WINDOW_MS / 60000);
    }

    const confidence = checkIns.length === 0 && minutesToKickoff === null ? 0.15 : 0.45;
    return {
      venueId,
      level: clampLevel(score),
      source: "estimated",
      confidence,
      signals: {
        recentReports: 0,
        recentCheckIns: checkIns.length,
        minutesToKickoff,
        capacity,
      },
    };
  }
}
