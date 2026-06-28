# Data Cleanup Scripts

This directory contains utilities for managing and cleaning up FanWatch data in both local files and Supabase.

## World Cup 2026 Cleanup

Removes all data for teams not participating in FIFA World Cup 2026.

### What It Does

- **Removes venues** that only support non-WC teams
- **Removes matches** where neither team participates in WC 2026
- **Removes events** oriented toward non-WC teams
- **Keeps venues/events** with no team affiliation or those supporting WC teams
- **Updates both** local JSONL files and Supabase (if `DATABASE_URL` configured)

### Usage

**Dry-run (see what would be deleted):**

```bash
cd ingestion
npm run cleanup:wc2026 -- --dry-run
```

**Cleanup specific cities:**

```bash
npm run cleanup:wc2026 -- --dry-run --cities=new-york,los-angeles,miami
```

**Execute cleanup (writes changes):**

```bash
npm run cleanup:wc2026
```

**Skip local file updates (Supabase only):**

```bash
npm run cleanup:wc2026 -- --dry-run --no-files
```

### FIFA World Cup 2026 Teams

**32 participating nations:**

- **CONCACAF (7):** USA, Canada, Mexico, Costa Rica, Panama, Jamaica, Honduras
- **South America (6):** Argentina, Brazil, Uruguay, Colombia, Ecuador, Paraguay
- **Europe (12):** England, France, Germany, Spain, Portugal, Netherlands, Belgium, Italy, Croatia, Switzerland, Denmark, Serbia
- **Africa (5):** Morocco, Senegal, Cameroon, Ghana, Tunisia
- **Asia/Oceania (5):** Japan, South Korea, Iran, Saudi Arabia, Australia

### Data Affected

**Local files (ingestion/data/):**

- `venues.jsonl` - filtered by `supportsTeams`
- `matches.jsonl` - filtered by `homeTeam` and `awayTeam`
- `events.jsonl` - filtered by `teams`

**Supabase tables:**

- `venues` - rows with non-WC `supports_teams` only
- `matches` - rows with both teams outside WC
- `events` - rows with non-WC `teams` only

### Example: Dry-Run Output

```
World Cup 2026 cleanup dryRun=true teams=USA,CAN,MEX,... cities=all
Processing city city=new-york dryRun=true
City complete city=new-york venuesRemoved=2 matchesRemoved=0 eventsRemoved=1
...
Cleanup summary venuesRemoved=45 matchesRemoved=12 eventsRemoved=8 dryRun=true mode="DRY RUN (no changes made)"
```

### Important Notes

1. **Backup first:** If using Supabase, create a backup before running without `--dry-run`
2. **Always dry-run first:** Understand what will be deleted before executing
3. **Idempotent:** Safe to run multiple times; subsequent runs will have fewer/no deletions
4. **Local precedence:** JSONL files in `ingestion/data/` are the local source of truth; Supabase is updated via `SupabasePublisher`
5. **Engagement data:** This only affects canonical data (venues, matches, events); engagement data (reviews, checkins) is preserved

### Implementation

See `src/refresh/cleanupWorldCup2026.ts` for full implementation.

- Loads WC 2026 team codes from the `WORLD_CUP_2026_CODES` constant in `src/refresh/cleanupWorldCup2026.ts`
- Validates each venue/match/event against the team set
- Reports stats for each city
- Supports dry-run for safe preview
