/** Vibe intensity slider: 0 = dead, 10 = electric. */
export const VIBE_MIN = 0;
export const VIBE_MAX = 10;

interface VibeBand {
  /** Inclusive lower bound of the band on the 0..10 scale. */
  min: number;
  label: string;
  emoji: string;
}

/** Display bands across the 0..10 intensity scale. */
const BANDS: VibeBand[] = [
  { min: 0, label: "Dead", emoji: "💤" },
  { min: 2, label: "Quiet", emoji: "🤫" },
  { min: 4, label: "Lively", emoji: "🙂" },
  { min: 6, label: "Buzzing", emoji: "🎉" },
  { min: 8, label: "Electric", emoji: "⚡" },
];

/** Resolve an intensity (0..10) to its display band. */
export function vibeBand(intensity: number): VibeBand {
  let band = BANDS[0]!;
  for (const b of BANDS) {
    if (intensity >= b.min) band = b;
  }
  return band;
}

/** Compact "⚡ Electric · 9" style label for an intensity value. */
export function vibeLabel(intensity: number): string {
  const b = vibeBand(intensity);
  const shown = Math.round(intensity * 10) / 10;
  return `${b.emoji} ${b.label} · ${shown}`;
}
