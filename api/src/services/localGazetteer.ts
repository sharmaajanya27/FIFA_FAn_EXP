/**
 * In-house geocoder backed by a gazetteer built from owned venue data.
 *
 * Loads per-city `gazetteer.jsonl` (postcodes + localities with centroids,
 * produced by the ingestion `npm run gazetteer` builder) plus metro and stadium
 * anchors, so the common "search by zip / neighborhood / stadium" query
 * resolves locally — no external geocoder, no rate limit, $0. The remote
 * provider stays as the fallback for the long tail (see `GeocodeService`).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { METROS } from "../config/metros.js";
import { log } from "../util/logger.js";
import type { GeocodeResult } from "./geocode.js";

interface Entry {
  normalized: string;
  name: string;
  /** "postcode" | "locality" | "city" | "stadium" */
  kind: string;
  lat: number;
  lon: number;
  /** Metro slug this entry belongs to. */
  city: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export class LocalGazetteer {
  private byCity = new Map<string, Entry[]>();
  private all: Entry[] = [];

  constructor(dataDir?: string) {
    this.seedAnchors();
    if (dataDir) this.loadFiles(dataDir);
    log.info("gazetteer: loaded", { entries: this.all.length });
  }

  private push(e: Entry): void {
    this.all.push(e);
    const arr = this.byCity.get(e.city);
    if (arr) arr.push(e);
    else this.byCity.set(e.city, [e]);
  }

  /** Metro centers + stadiums — always available, even without data files. */
  private seedAnchors(): void {
    for (const m of METROS) {
      this.push({
        normalized: norm(m.name),
        name: m.name,
        kind: "city",
        lat: m.center.lat,
        lon: m.center.lon,
        city: m.slug,
      });
      if (m.stadium) {
        this.push({
          normalized: norm(m.stadium.name),
          name: m.stadium.name,
          kind: "stadium",
          lat: m.stadium.center.lat,
          lon: m.stadium.center.lon,
          city: m.slug,
        });
      }
    }
  }

  private loadFiles(dataDir: string): void {
    if (!existsSync(dataDir)) return;
    for (const slug of readdirSync(dataDir)) {
      const file = path.join(dataDir, slug, "gazetteer.jsonl");
      if (!existsSync(file)) continue;
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!line.trim()) continue;
        try {
          const o = JSON.parse(line) as {
            name: string;
            normalized?: string;
            kind: string;
            lat: number;
            lon: number;
          };
          this.push({
            normalized: o.normalized ?? norm(o.name),
            name: o.name,
            kind: o.kind,
            lat: o.lat,
            lon: o.lon,
            city: slug,
          });
        } catch {
          // skip malformed line
        }
      }
    }
  }

  /**
   * Resolve a free-text query to a point, scoped to `citySlug`. Returns null
   * when no confident local match exists (caller falls back to the remote,
   * metro-biased provider). When a city is in scope we deliberately do NOT
   * search other metros — a London query for "Camden" must not resolve to
   * Camden, NJ; it returns null so the remote provider resolves it in-metro.
   */
  lookup(q: string, citySlug?: string): GeocodeResult | null {
    const nq = norm(q);
    if (!nq) return null;

    const cityPool = citySlug ? this.byCity.get(citySlug) : undefined;
    const pool = cityPool ?? this.all; // city-scoped if known, else global
    const best = this.bestIn(pool, nq);
    return best ? { lat: best.lat, lon: best.lon, label: this.label(best), kind: best.kind } : null;
  }

  /** Prefer exact normalized match, then prefix, then substring. */
  private bestIn(pool: Entry[], nq: string): Entry | null {
    let starts: Entry | null = null;
    let includes: Entry | null = null;
    for (const e of pool) {
      if (e.normalized === nq) return e;
      if (!starts && nq.length >= 3 && e.normalized.startsWith(nq)) starts = e;
      else if (!includes && nq.length >= 4 && e.normalized.includes(nq)) includes = e;
    }
    return starts ?? includes;
  }

  private label(e: Entry): string {
    const metro = METROS.find((m) => m.slug === e.city);
    const city = metro?.name;
    return city && norm(city) !== e.normalized ? `${e.name}, ${city}` : e.name;
  }
}
