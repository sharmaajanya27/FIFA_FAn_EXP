/**
 * Generic persistent collection store for Phase 2 writes.
 *
 * Each collection is a JSON array persisted to data/engagement/<name>.json.
 * Writes are serialized per collection to avoid interleaved file writes. This
 * is the write seam: a Postgres/DynamoDB-backed Store implementing the same
 * surface swaps in without touching services/handlers.
 *
 * (Dev-grade: full-file rewrite per save, in-process only. Fine for local
 * development; not for concurrent multi-instance production.)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";

export interface Identified {
  id: string;
}

/**
 * Storage-agnostic collection surface. `JsonCollection` (files) and
 * `PgCollection` (Postgres) both implement it, so services depend on this
 * interface and never on a concrete backend (ARCHITECTURE §2.2).
 */
export interface Collection<T extends Identified> {
  all(): Promise<T[]>;
  find(predicate: (item: T) => boolean): Promise<T[]>;
  findOne(predicate: (item: T) => boolean): Promise<T | undefined>;
  insert(item: Omit<T, "id"> & { id?: string }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
}

/** The write store: hands out collections by name. */
export interface Store {
  collection<T extends Identified>(name: string): Collection<T>;
}

export class JsonCollection<T extends Identified> implements Collection<T> {
  private items: T[] | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private readonly file: string;

  constructor(baseDir: string, name: string) {
    this.file = resolve(baseDir, "engagement", `${name}.json`);
  }

  private async ensureLoaded(): Promise<T[]> {
    if (this.items) return this.items;
    try {
      this.items = JSON.parse(await readFile(this.file, "utf8")) as T[];
    } catch {
      this.items = [];
    }
    return this.items;
  }

  private async persist(): Promise<void> {
    const snapshot = JSON.stringify(this.items ?? [], null, 2);
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      await writeFile(this.file, snapshot, "utf8");
    });
    return this.writeChain;
  }

  async all(): Promise<T[]> {
    return [...(await this.ensureLoaded())];
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    return (await this.ensureLoaded()).filter(predicate);
  }

  async findOne(predicate: (item: T) => boolean): Promise<T | undefined> {
    return (await this.ensureLoaded()).find(predicate);
  }

  async insert(item: Omit<T, "id"> & { id?: string }): Promise<T> {
    const items = await this.ensureLoaded();
    const record = { ...item, id: item.id ?? randomUUID() } as T;
    items.push(record);
    await this.persist();
    return record;
  }

  async update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const items = await this.ensureLoaded();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    const updated = { ...items[idx]!, ...patch, id } as T;
    items[idx] = updated;
    await this.persist();
    return updated;
  }
}

export class JsonStore implements Store {
  private collections = new Map<string, Collection<Identified>>();
  constructor(private readonly dataDir: string) {}

  collection<T extends Identified>(name: string): Collection<T> {
    const existing = this.collections.get(name);
    if (existing) return existing as unknown as Collection<T>;
    const created = new JsonCollection<T>(this.dataDir, name);
    this.collections.set(name, created as unknown as Collection<Identified>);
    return created;
  }
}

export { randomUUID as newId };
export const dataPath = (dataDir: string, ...parts: string[]) =>
  join(dataDir, ...parts);
