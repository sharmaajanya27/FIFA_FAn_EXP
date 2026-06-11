/**
 * Tiny zero-dependency .env loader. Loads KEY=VALUE pairs into process.env
 * without overwriting variables already set in the real environment. Missing
 * file is a no-op (defaults in config/env.ts take over).
 */
import { readFileSync } from "node:fs";

export function loadDotenv(path = ".env"): void {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return; // no .env — fine, defaults apply
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
