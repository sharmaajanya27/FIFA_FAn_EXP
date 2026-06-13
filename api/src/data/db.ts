/**
 * Single postgres.js client, built from DATABASE_URL. Used by PgRepository
 * (discovery reads) and PgStore (engagement writes). Supabase requires TLS;
 * a local Postgres / the PGlite test harness does not.
 */
import postgres from "postgres";

export type Sql = ReturnType<typeof postgres>;

let client: Sql | undefined;

export function getSql(databaseUrl: string): Sql {
  if (!client) {
    const isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);
    // Supabase's transaction pooler (port 6543) doesn't support prepared
    // statements; disable them there so postgres.js works on any Supabase
    // connection string (direct, session pooler, or transaction pooler).
    const isTxnPooler = /:6543\b|pgbouncer=true/.test(databaseUrl);
    client = postgres(databaseUrl, {
      ssl: isLocal ? false : "require",
      max: 10,
      prepare: !isTxnPooler,
    });
  }
  return client;
}

export async function closeSql(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = undefined;
  }
}
