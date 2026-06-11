/**
 * Source manifest — tracks lastScrapedAt per (source, city) so refreshes can be
 * incremental (PRD §5.4: scheduled, incremental refresh). Persisted to
 * data/manifest.json. In production a Lambda on an EventBridge schedule reads
 * this to decide which sources are stale enough to re-pull.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { log } from "../util/logger.js";

export interface ManifestEntry {
  source: string;
  city: string;
  lastScrapedAt: string;
  records: number;
}
export interface Manifest {
  entries: ManifestEntry[];
}

function key(source: string, city: string): string {
  return `${source}::${city}`;
}

export class SourceManifest {
  private map = new Map<string, ManifestEntry>();

  constructor(private readonly dataDir: string) {}

  private file(): string {
    return resolve(this.dataDir, "manifest.json");
  }

  async load(): Promise<void> {
    try {
      const text = await readFile(this.file(), "utf8");
      const data = JSON.parse(text) as Manifest;
      this.map = new Map(data.entries.map((e) => [key(e.source, e.city), e]));
    } catch {
      this.map = new Map(); // first run — no manifest yet
    }
  }

  /** True if the source/city was scraped more recently than maxAgeMs ago. */
  isFresh(source: string, city: string, maxAgeMs: number): boolean {
    const entry = this.map.get(key(source, city));
    if (!entry) return false;
    return Date.now() - new Date(entry.lastScrapedAt).getTime() < maxAgeMs;
  }

  record(source: string, city: string, records: number): void {
    this.map.set(key(source, city), {
      source,
      city,
      lastScrapedAt: new Date().toISOString(),
      records,
    });
  }

  async save(): Promise<void> {
    await mkdir(resolve(this.dataDir), { recursive: true });
    const data: Manifest = { entries: [...this.map.values()] };
    await writeFile(this.file(), JSON.stringify(data, null, 2), "utf8");
    log.info("manifest: saved", { file: this.file(), entries: data.entries.length });
  }
}
