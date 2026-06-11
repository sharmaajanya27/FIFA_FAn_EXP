/**
 * Loads the ranking weights from scoring.json so they can be tuned without a
 * code change/deploy (PRD §6.5). An ops override path can be added later
 * (e.g. fetch from a config store); the shape stays the same.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export interface SignalWeight {
  weight: number;
  stage: "static" | "queryTime";
}
export interface ScoringConfig {
  weights: Record<string, SignalWeight>;
  normalization: {
    ratingMax: number;
    capacityMax: number;
    engagementMax: number;
  };
}

const CONFIG_URL = new URL("./scoring.json", import.meta.url);

export async function loadScoringConfig(): Promise<ScoringConfig> {
  const text = await readFile(fileURLToPath(CONFIG_URL), "utf8");
  const raw = JSON.parse(text) as ScoringConfig;
  return raw;
}
