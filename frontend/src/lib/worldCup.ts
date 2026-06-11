/**
 * Seasonal status for the FIFA World Cup 2026. FanWatch is a standalone app,
 * but while the tournament is on we surface a contextual banner whose message
 * updates automatically based on the current date relative to the schedule.
 */

// Official FIFA World Cup 2026 window (opening match → final), local time.
export const WORLD_CUP_START = new Date("2026-06-11T00:00:00");
export const WORLD_CUP_END = new Date("2026-07-19T23:59:59");

export interface SeasonStatus {
  /** Whether to show the seasonal banner at all. */
  show: boolean;
  /** Short status label shown in the gold chip. */
  status: string;
  /** Whether the live pulse dot should be shown (tournament under way). */
  live: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** How many days before the tournament we start showing the countdown. */
const LEAD_IN_DAYS = 30;
/** How many days after the final we keep the celebratory banner up. */
const WIND_DOWN_DAYS = 3;

/**
 * Compute the seasonal banner status for a given moment. Pure and
 * deterministic so it can be unit-tested and called from the client.
 */
export function worldCupStatus(now: Date = new Date()): SeasonStatus {
  const t = now.getTime();
  const start = WORLD_CUP_START.getTime();
  const end = WORLD_CUP_END.getTime();

  // Before the tournament: count down once we're within the lead-in window.
  if (t < start) {
    const daysUntil = Math.ceil((start - t) / MS_PER_DAY);
    if (daysUntil > LEAD_IN_DAYS) {
      return { show: false, status: "", live: false };
    }
    if (daysUntil <= 1) {
      return { show: true, status: "Kicks off tomorrow", live: false };
    }
    return {
      show: true,
      status: `Kicks off in ${daysUntil} days`,
      live: false,
    };
  }

  // During the tournament.
  if (t <= end) {
    return { show: true, status: "Live now", live: true };
  }

  // Just after the final: brief celebratory wind-down, then hide.
  const daysAfter = Math.floor((t - end) / MS_PER_DAY);
  if (daysAfter <= WIND_DOWN_DAYS) {
    return { show: true, status: "Champions crowned", live: false };
  }
  return { show: false, status: "", live: false };
}
