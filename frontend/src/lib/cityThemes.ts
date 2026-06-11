/**
 * Per-city visual identity for the FIFA World Cup 2026 theme. Each host city
 * gets an accent color and a silhouette "shape" (skyline / mountains / coast /
 * bridge) that is rendered as a tinted SVG band across the bottom of the page,
 * so the background changes with the selected city.
 */
export type CityShape = "skyline" | "mountains" | "coast" | "bridge";

export interface CityTheme {
  /** Accent color used to tint the background gradient and the skyline band. */
  accent: string;
  /** Which silhouette SVG (in /public/cities) to render as the background band. */
  shape: CityShape;
  /** Short description of the scene (for accessibility). */
  label: string;
}

const DEFAULT_THEME: CityTheme = {
  accent: "#0aa15a",
  shape: "skyline",
  label: "city skyline",
};

const THEMES: Record<string, CityTheme> = {
  "jersey-city": {
    accent: "#1d4e89",
    shape: "skyline",
    label: "New York harbor skyline",
  },
  "new-york": {
    accent: "#1d4e89",
    shape: "skyline",
    label: "New York skyline",
  },
  london: { accent: "#c8102e", shape: "skyline", label: "London skyline" },
  "buenos-aires": {
    accent: "#5aa9e6",
    shape: "skyline",
    label: "Buenos Aires skyline",
  },
  "sao-paulo": {
    accent: "#009c3b",
    shape: "skyline",
    label: "São Paulo skyline",
  },
  madrid: { accent: "#b91d2e", shape: "skyline", label: "Madrid skyline" },
  "mexico-city": {
    accent: "#006847",
    shape: "mountains",
    label: "Mexico City and the valley",
  },
  tokyo: { accent: "#bc002d", shape: "skyline", label: "Tokyo skyline" },
  atlanta: { accent: "#e8703a", shape: "skyline", label: "Atlanta skyline" },
  boston: { accent: "#0d3b66", shape: "coast", label: "Boston harbor" },
  dallas: { accent: "#003087", shape: "skyline", label: "Dallas skyline" },
  houston: { accent: "#002d62", shape: "skyline", label: "Houston skyline" },
  "kansas-city": {
    accent: "#1d4e89",
    shape: "skyline",
    label: "Kansas City skyline",
  },
  "los-angeles": {
    accent: "#ef6c4d",
    shape: "coast",
    label: "Los Angeles coast",
  },
  miami: { accent: "#00b4d8", shape: "coast", label: "Miami beach" },
  philadelphia: {
    accent: "#004c54",
    shape: "skyline",
    label: "Philadelphia skyline",
  },
  "san-francisco": {
    accent: "#c1440e",
    shape: "bridge",
    label: "Golden Gate Bridge",
  },
  seattle: {
    accent: "#2e8b57",
    shape: "mountains",
    label: "Seattle and Mount Rainier",
  },
  toronto: { accent: "#d80621", shape: "skyline", label: "Toronto skyline" },
  vancouver: {
    accent: "#1b998b",
    shape: "mountains",
    label: "Vancouver coastal mountains",
  },
  guadalajara: {
    accent: "#c8102e",
    shape: "skyline",
    label: "Guadalajara skyline",
  },
  monterrey: {
    accent: "#0a2240",
    shape: "mountains",
    label: "Monterrey and Cerro de la Silla",
  },
};

export function cityTheme(slug: string): CityTheme {
  return THEMES[slug] ?? DEFAULT_THEME;
}

/** A single scattered football decoration in the background. */
export interface ScatterBall {
  /** Horizontal position as a percentage of the viewport width. */
  left: number;
  /** Vertical position as a percentage of the viewport height. */
  top: number;
  /** Diameter in pixels. */
  size: number;
  /** Rotation in degrees. */
  rotate: number;
}

/** Small deterministic PRNG (mulberry32) so each city gets a stable layout. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate a stable set of scattered footballs for a city. The layout is
 * deterministic per slug (so it never flickers between renders) but differs
 * from one city to the next.
 */
export function scatterBalls(slug: string, count = 9): ScatterBall[] {
  const rand = seededRandom(hashSlug(slug || "default"));
  const balls: ScatterBall[] = [];
  for (let i = 0; i < count; i += 1) {
    balls.push({
      left: Math.round(rand() * 94 + 2),
      top: Math.round(rand() * 90 + 3),
      size: Math.round(rand() * 56 + 40),
      rotate: Math.round(rand() * 360),
    });
  }
  return balls;
}
