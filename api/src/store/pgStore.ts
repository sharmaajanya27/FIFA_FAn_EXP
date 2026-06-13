/**
 * Postgres-backed engagement store (write seam). Implements the same
 * `Store` / `Collection` interfaces as `jsonStore`, so `AuthService` and every
 * engagement service are untouched (ARCHITECTURE §2.2).
 *
 * All records for a logical collection live in the generic `engagement` table
 * keyed by (collection, id), with the record in a `data` jsonb column. `find` /
 * `findOne` load the collection's rows and filter in JS — identical semantics
 * to the file store (which also materializes the whole collection).
 */
import { randomUUID } from "node:crypto";
import type { Collection, Identified, Store } from "./jsonStore.js";
import type { Sql } from "../data/db.js";

export class PgCollection<T extends Identified> implements Collection<T> {
  constructor(
    private readonly sql: Sql,
    private readonly name: string,
  ) {}

  private async rows(): Promise<T[]> {
    const res = await this.sql<{ data: T }[]>`
      select data from engagement where collection = ${this.name}`;
    return res.map((r) => r.data);
  }

  async all(): Promise<T[]> {
    return this.rows();
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    return (await this.rows()).filter(predicate);
  }

  async findOne(predicate: (item: T) => boolean): Promise<T | undefined> {
    return (await this.rows()).find(predicate);
  }

  async insert(item: Omit<T, "id"> & { id?: string }): Promise<T> {
    const record = { ...item, id: item.id ?? randomUUID() } as T;
    await this.sql`
      insert into engagement (collection, id, data)
      values (${this.name}, ${record.id}, ${this.sql.json(record as never)})
      on conflict (collection, id)
        do update set data = excluded.data, updated_at = now()`;
    return record;
  }

  async update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const existing = await this.findOne((i) => i.id === id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id } as T;
    await this.sql`
      update engagement set data = ${this.sql.json(updated as never)}, updated_at = now()
      where collection = ${this.name} and id = ${id}`;
    return updated;
  }
}

export class PgStore implements Store {
  private cache = new Map<string, Collection<Identified>>();
  constructor(private readonly sql: Sql) {}

  collection<T extends Identified>(name: string): Collection<T> {
    const existing = this.cache.get(name);
    if (existing) return existing as unknown as Collection<T>;
    const created = new PgCollection<T>(this.sql, name);
    this.cache.set(name, created as unknown as Collection<Identified>);
    return created;
  }
}
