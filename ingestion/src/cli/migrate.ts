/**
 * Apply the SQL migrations in `supabase/migrations/` to DATABASE_URL, in
 * filename order. Zero-dependency beyond the `postgres` client we already use:
 * runs on Windows with no Supabase CLI / psql install, and identically in CI.
 *
 * The migrations are idempotent (`create table if not exists`), so re-running
 * is safe. Each file is executed with `sql.unsafe()` (simple-query protocol) so
 * multi-statement files work and Supabase's transaction pooler is happy.
 *
 *   DATABASE_URL=postgres://... npm run migrate   (in ingestion/)
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { loadDotenv } from "../util/dotenv.js";
import { log } from "../util/logger.js";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations",
);

async function main(): Promise<void> {
  loadDotenv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    log.error("migrate: DATABASE_URL is not set");
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    log.warn("migrate: no .sql files found", { dir: MIGRATIONS_DIR });
    return;
  }

  const sql = postgres(url, {
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    max: 1,
  });
  try {
    for (const file of files) {
      const text = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await sql.unsafe(text);
      log.info("migrate: applied", { file });
    }
    log.info("migrate: done", { applied: files.length });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  log.error("migrate: failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
