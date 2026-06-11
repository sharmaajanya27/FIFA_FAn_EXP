/**
 * Excel publisher — human-review report (NOT the source of truth).
 *
 * Produces data/<city>/venues.xlsx for eyeballing coverage and data quality.
 * Generated from the same canonical venues as the JSONL output.
 */
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import ExcelJS from "exceljs";
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";
import type { PublishContext, Publisher } from "./types.js";

export class ExcelPublisher implements Publisher {
  readonly id = "excel";

  constructor(private readonly dataDir: string) {}

  async publishVenues(venues: Venue[], ctx: PublishContext): Promise<void> {
    const dir = resolve(this.dataDir, ctx.citySlug);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "venues.xlsx");

    const wb = new ExcelJS.Workbook();
    wb.creator = "FanWatch Ingestion";
    wb.created = new Date();
    const ws = wb.addWorksheet("Venues");

    ws.columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "Name", key: "name", width: 32 },
      { header: "Kind", key: "kind", width: 12 },
      { header: "Lat", key: "lat", width: 12 },
      { header: "Lon", key: "lon", width: 12 },
      { header: "Geohash", key: "geohash", width: 12 },
      { header: "Address", key: "address", width: 40 },
      { header: "City", key: "city", width: 16 },
      { header: "Country", key: "country", width: 9 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Website", key: "website", width: 30 },
      { header: "Hours", key: "hours", width: 24 },
      { header: "Rating", key: "ratingAvg", width: 8 },
      { header: "Score", key: "score", width: 8 },
      { header: "Supports", key: "supportsTeams", width: 18 },
      { header: "Sources", key: "sources", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    for (const v of venues) {
      ws.addRow({
        id: v.id,
        name: v.name,
        kind: v.kind,
        lat: v.geo.lat,
        lon: v.geo.lon,
        geohash: v.geohash,
        address: v.address ?? "",
        city: v.city ?? "",
        country: v.country ?? "",
        phone: v.phone ?? "",
        website: v.website ?? "",
        hours: v.hours ?? "",
        ratingAvg: v.ratingAvg ?? "",
        score: v.score ?? "",
        supportsTeams: v.supportsTeams.join(", "),
        sources: v.sources.map((s) => s.name).join(", "),
      });
    }

    await wb.xlsx.writeFile(file);
    log.info("excel: wrote report", { file, count: venues.length });
  }

  async publishMatches(matches: Match[], ctx: PublishContext): Promise<void> {
    const dir = resolve(this.dataDir, ctx.citySlug);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "matches.xlsx");

    const wb = new ExcelJS.Workbook();
    wb.creator = "FanWatch Ingestion";
    const ws = wb.addWorksheet("Matches");
    ws.columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "Competition", key: "competition", width: 22 },
      { header: "Home", key: "homeTeam", width: 8 },
      { header: "Away", key: "awayTeam", width: 8 },
      { header: "Kickoff (UTC)", key: "kickoff", width: 22 },
      { header: "Stage", key: "stage", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const m of matches) {
      ws.addRow({
        id: m.id,
        competition: m.competition,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        kickoff: m.kickoff,
        stage: m.stage ?? "",
      });
    }
    await wb.xlsx.writeFile(file);
    log.info("excel: wrote report", { file, count: matches.length });
  }

  async publishEvents(events: Event[], ctx: PublishContext): Promise<void> {
    const dir = resolve(this.dataDir, ctx.citySlug);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "events.xlsx");

    const wb = new ExcelJS.Workbook();
    wb.creator = "FanWatch Ingestion";
    const ws = wb.addWorksheet("Events");
    ws.columns = [
      { header: "ID", key: "id", width: 18 },
      { header: "Title", key: "title", width: 44 },
      { header: "Kind", key: "kind", width: 16 },
      { header: "Start (UTC)", key: "startTime", width: 22 },
      { header: "Lat", key: "lat", width: 12 },
      { header: "Lon", key: "lon", width: 12 },
      { header: "Match", key: "matchId", width: 18 },
      { header: "Teams", key: "teams", width: 14 },
      { header: "Est. Attendance", key: "estAttendance", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const e of events) {
      ws.addRow({
        id: e.id,
        title: e.title,
        kind: e.kind,
        startTime: e.startTime,
        lat: e.geo.lat,
        lon: e.geo.lon,
        matchId: e.matchId ?? "",
        teams: e.teams.join(", "),
        estAttendance: e.estAttendance ?? "",
      });
    }
    await wb.xlsx.writeFile(file);
    log.info("excel: wrote report", { file, count: events.length });
  }
}
