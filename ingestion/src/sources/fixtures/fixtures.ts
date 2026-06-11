/**
 * Match-schedule (fixtures) connector — Collect stage for MATCH.
 *
 * Reads competition fixtures from a bundled open-data seed so the pipeline is
 * deterministic and runs offline. If FIXTURES_URL is set, it fetches a remote
 * JSON in the same shape first (this is where a keyed live source — e.g.
 * football-data.org / OpenFootball — plugs into the same interface) and falls
 * back to the seed on any failure.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Env } from "../../config/env.js";
import type { Source } from "../../models/canonical.js";
import { log } from "../../util/logger.js";
import type { MatchConnector, RawRecord } from "../types.js";

interface SeedMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  stage?: string;
}
interface SeedFile {
  competition: string;
  matches: SeedMatch[];
}

const SEED_URL = new URL(
  "../../seeds/matches.worldcup-2026.json",
  import.meta.url,
);

export class FixturesConnector implements MatchConnector {
  readonly id = "fixtures-seed";

  constructor(private readonly env: Env) {}

  private async loadSeed(): Promise<SeedFile> {
    const text = await readFile(fileURLToPath(SEED_URL), "utf8");
    return JSON.parse(text) as SeedFile;
  }

  private async loadRemote(url: string): Promise<SeedFile | null> {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": this.env.userAgent },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as SeedFile;
      if (!data?.matches?.length) throw new Error("empty fixtures payload");
      return data;
    } catch (err) {
      log.warn("fixtures: remote fetch failed, using seed", {
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async collectMatches(): Promise<RawRecord[]> {
    const remote = this.env.fixturesUrl
      ? await this.loadRemote(this.env.fixturesUrl)
      : null;
    const data = remote ?? (await this.loadSeed());
    const scrapedAt = new Date().toISOString();

    const records: RawRecord[] = data.matches.map((m) => {
      const source: Source = {
        name: this.id,
        type: "schedule",
        scrapedAt,
        externalId: m.externalId,
      };
      return {
        source,
        payload: { competition: data.competition, ...m },
      };
    });

    log.info("fixtures: collected matches", {
      competition: data.competition,
      count: records.length,
      origin: remote ? "remote" : "seed",
    });
    return records;
  }
}
