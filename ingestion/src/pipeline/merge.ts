/**
 * Incremental merge for Phase 0 publishing.
 *
 * Ingestion is incremental, not destructive: a re-run must NOT drop records
 * that were published previously. We merge the freshly scraped batch with what
 * is already on disk, keyed by the stable canonical `id`:
 *   - new id           → added
 *   - existing id      → updated (the fresh record wins; it's the latest scrape)
 *   - on-disk-only id  → preserved (a source that went quiet doesn't erase it)
 */
export function mergeById<T extends { id: string }>(
  existing: T[],
  fresh: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of fresh) byId.set(row.id, row);
  return [...byId.values()];
}
