/**
 * Build an in-house geocoding gazetteer from already-published venue data.
 *
 * For each city we read `data/<slug>/venues.jsonl` and extract:
 *   - postcodes  (e.g. "10016", "W2 1JQ") → centroid of all venues with it
 *   - localities (e.g. "Hoboken", "Camden") → centroid of all venues in it
 *
 * The result (`data/<slug>/gazetteer.jsonl`) lets the API resolve the common
 * "search by zip / neighborhood" query locally — no external geocoder, no rate
 * limit, $0 — falling back to a remote provider only for the long tail.
 *
 * Usage:
 *   npm run gazetteer            # all cities
 *   npm run gazetteer -- london  # one city
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CITIES } from "../config/cities.js";
import { loadEnv } from "../config/env.js";
import { loadDotenv } from "../util/dotenv.js";
import { log } from "../util/logger.js";

interface GazEntry {
  name: string;
  normalized: string;
  kind: "postcode" | "locality";
  lat: number;
  lon: number;
  count: number;
}

/** Postcode patterns, tried in order; first match wins per address. */
const POSTCODE_PATTERNS: RegExp[] = [
  /\b[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/i, // UK: W2 1JQ, NW1 8AF
  /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, // Canada: M5V 2T6
  /\b\d{3}-\d{4}\b/, // Japan: 102-0083
  /\b\d{5}(?:-\d{4})?\b/, // US/MX/ES/EU 5-digit (+ZIP4)
];

const MIN_LOCALITY = 3; // ignore one-off street fragments
const MIN_POSTCODE = 1;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function extractPostcode(address: string): string | null {
  for (const re of POSTCODE_PATTERNS) {
    const m = address.match(re);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

/** Accumulates lat/lon sums per key so we can emit a centroid. */
interface Acc {
  name: string;
  kind: "postcode" | "locality";
  sumLat: number;
  sumLon: number;
  count: number;
}

function buildCity(slug: string, dataDir: string): GazEntry[] {
  const file = path.resolve(dataDir, slug, "venues.jsonl");
  if (!existsSync(file)) return [];

  const cityName = CITIES[slug]?.name ?? "";
  const cityNorm = norm(cityName);
  const buckets = new Map<string, Acc>();

  const add = (key: string, name: string, kind: Acc["kind"], lat: number, lon: number) => {
    const k = `${kind}:${key}`;
    const cur = buckets.get(k);
    if (cur) {
      cur.sumLat += lat;
      cur.sumLon += lon;
      cur.count += 1;
    } else {
      buckets.set(k, { name, kind, sumLat: lat, sumLon: lon, count: 1 });
    }
  };

  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let v: {
      address?: string;
      geo?: { lat: number; lon: number };
    };
    try {
      v = JSON.parse(line);
    } catch {
      continue;
    }
    const address = v.address;
    const geo = v.geo;
    if (!address || !geo || typeof geo.lat !== "number" || typeof geo.lon !== "number") continue;

    const postcode = extractPostcode(address);
    if (postcode) add(norm(postcode), postcode, "postcode", geo.lat, geo.lon);

    // Locality candidates: comma parts minus the street (index 0) and postcode.
    const parts = address.split(",").map((p) => p.trim());
    parts.slice(1).forEach((part) => {
      if (!part) return;
      if (extractPostcode(part)) return; // it's the postcode segment
      const n = norm(part);
      if (!n || n.length < 2) return;
      if (!/\p{Letter}/u.test(part)) return; // must contain letters
      if (n === cityNorm) return; // the city itself isn't a neighborhood
      add(n, part, "locality", geo.lat, geo.lon);
    });
  }

  const out: GazEntry[] = [];
  for (const acc of buckets.values()) {
    const min = acc.kind === "postcode" ? MIN_POSTCODE : MIN_LOCALITY;
    if (acc.count < min) continue;
    out.push({
      name: acc.name,
      normalized: norm(acc.name),
      kind: acc.kind,
      lat: +(acc.sumLat / acc.count).toFixed(6),
      lon: +(acc.sumLon / acc.count).toFixed(6),
      count: acc.count,
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

function main(): void {
  loadDotenv();
  const env = loadEnv();
  const args = process.argv.slice(2).filter((a) => a !== "all");
  const slugs = args.length > 0 ? args : Object.keys(CITIES);

  let totalEntries = 0;
  for (const slug of slugs) {
    const entries = buildCity(slug, env.dataDir);
    if (entries.length === 0) {
      log.warn("gazetteer: no entries", { city: slug });
      continue;
    }
    const outPath = path.resolve(env.dataDir, slug, "gazetteer.jsonl");
    writeFileSync(outPath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
    totalEntries += entries.length;
    const pc = entries.filter((e) => e.kind === "postcode").length;
    log.info("gazetteer: wrote", {
      city: slug,
      entries: entries.length,
      postcodes: pc,
      localities: entries.length - pc,
    });
  }
  log.info("gazetteer: done", { cities: slugs.length, entries: totalEntries });
}

main();
