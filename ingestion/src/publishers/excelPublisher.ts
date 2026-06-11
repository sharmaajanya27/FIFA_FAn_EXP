/**
 * Excel publisher — human-review report (NOT the source of truth).
 *
 * Produces data/<city>/venues.xlsx for eyeballing coverage and data quality.
 * Generated from the same canonical venues as the JSONL output.
 */
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import ExcelJS from "exceljs";
import type { Venue } from "../models/canonical.js";
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
    wb.creator = "FanMatch Ingestion";
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
        supportsTeams: v.supportsTeams.join(", "),
        sources: v.sources.map((s) => s.name).join(", "),
      });
    }

    await wb.xlsx.writeFile(file);
    log.info("excel: wrote report", { file, count: venues.length });
  }
}
