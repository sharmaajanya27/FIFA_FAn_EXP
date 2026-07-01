/**
 * Presentation helpers for the "Fan Festival" UI. These derive the festival
 * styling (palette colour per rank, category tag, affiliation line, capacity
 * label) purely from the REAL ranked-venue data the API already returns — no
 * invented crews, taglines, or attendance. Shared by the Lineup, the Headliner
 * panel, and the home page so the logic lives in one place.
 */
import type { RankedVenue } from "./types";
import { teamLabel } from "./teams";
import { formatDistance } from "./format";

/** Bunting palette — vivid hues for decorative flags/fills (not text). */
export const PALETTE = [
  "var(--c1)",
  "var(--c2)",
  "var(--c3)",
  "var(--c4)",
  "var(--c5)",
] as const;

/**
 * AA-safe variants of the palette for COLOURED TEXT on the cream background.
 * The vivid `--c*` hues drop below 4.5:1 on paper, so anything rendered as
 * readable text (rank numbers, category tags) uses these deeper tones, each
 * verified ≥4.5:1 against `--paper`.
 */
export const PALETTE_TEXT = [
  "var(--c1-text)",
  "var(--c2-text)",
  "var(--c3-text)",
  "var(--c4-text)",
  "var(--c5-text)",
] as const;

/** Vivid colour for a decorative flag/fill at a given 0-based position. */
export function paletteAt(index: number): string {
  return PALETTE[index % PALETTE.length] as string;
}

/** AA-safe text colour for the rank number / tag at a given 0-based position. */
export function paletteTextAt(index: number): string {
  return PALETTE_TEXT[index % PALETTE_TEXT.length] as string;
}

/** Human label for a venue's category, used as the coloured tag chip. */
const KIND_LABEL: Record<string, string> = {
  bar: "Bar",
  pub: "Pub",
  cafe: "Café",
  café: "Café",
  restaurant: "Restaurant",
  fan_zone: "Fan zone",
  fanzone: "Fan zone",
  stadium: "Stadium",
  brewery: "Brewery",
  taproom: "Taproom",
};
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind.toLowerCase()] ?? capitalize(kind.replace(/_/g, " "));
}

/**
 * The italic affiliation line beneath a venue name: distance, then the team
 * the crowd here reps (dominant team, else first supported team), formatted as
 * "USA crowd". Falls back to just the distance when no team is known.
 */
export function affiliationLine(v: RankedVenue): string {
  const dist = formatDistance(v.distanceMeters);
  const code = v.dominantTeam ?? v.supportsTeams[0];
  if (!code) return dist;
  return `${dist} · ${teamLabel(code)} crowd`;
}

export interface Capacity {
  /** Short uppercase label: "Packed" / "Filling fast" / "Room to move". */
  label: string;
  /** Whether the room is near capacity (drives the red accent). */
  packed: boolean;
}

/**
 * Capacity read relative to the busiest venue in the current set. When nobody
 * is checked in anywhere (max = 0, common in early production) we suppress the
 * label entirely rather than show a wall of "Room to move".
 */
export function capacityOf(hereCount: number, maxHere: number): Capacity | null {
  if (maxHere <= 0) return null;
  const pct = (hereCount / maxHere) * 100;
  if (pct >= 80) return { label: "Packed", packed: true };
  if (pct >= 45) return { label: "Filling fast", packed: false };
  return { label: "Room to move", packed: false };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
