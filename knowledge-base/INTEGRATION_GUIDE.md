# FanWatch Supabase Integration Script — World Cup 2026 Cleanup

## Overview

You now have a fully functional CLI tool that cleans up your FanWatch data to keep only teams playing in FIFA World Cup 2026. The script handles both **local JSONL files** and **Supabase database** simultaneously.

### Quick Start

**Preview what will be deleted (safe):**

```bash
cd ingestion
npm run cleanup:wc2026 -- --dry-run
```

**Execute the cleanup:**

```bash
npm run cleanup:wc2026
```

---

## Complete Command Reference

### Basic Usage

| Command                                                             | Description                             |
| ------------------------------------------------------------------- | --------------------------------------- |
| `npm run cleanup:wc2026`                                            | Cleanup all cities (executes changes)   |
| `npm run cleanup:wc2026 -- --dry-run`                               | Preview all changes (no modifications)  |
| `npm run cleanup:wc2026 -- --dry-run --cities=new-york,los-angeles` | Preview specific cities                 |
| `npm run cleanup:wc2026 -- --cities=new-york,los-angeles`           | Cleanup specific cities only            |
| `npm run cleanup:wc2026 -- --no-files`                              | Update only Supabase (skip local JSONL) |

### Combined Options

```bash
# Dry-run on specific cities, Supabase only
npm run cleanup:wc2026 -- --dry-run --cities=miami,toronto --no-files

# Cleanup all cities, update both local and Supabase
npm run cleanup:wc2026 -- --cities=all
```

---

## How It Works

### Data Matching

The script filters based on **team codes** (FIFA 3-letter format):

1. **Venues** — Kept if:
   - No team affiliation, OR
   - Supports at least one WC 2026 team

2. **Matches** — Kept if:
   - BOTH home and away teams are WC 2026 teams

3. **Events** — Kept if:
   - No team affiliation, OR
   - Oriented toward at least one WC 2026 team

### FIFA World Cup 2026 Teams (32 Total)

**CONCACAF (7):**

- 🇺🇸 USA · 🇨🇦 CAN · 🇲🇽 MEX
- 🇨🇷 CRC · 🇵🇦 PAN · 🇯🇲 JAM · 🇭🇳 HON

**South America (6):**

- 🇦🇷 ARG · 🇧🇷 BRA · 🇺🇾 URU · 🇨🇴 COL · 🇪🇨 ECU · 🇵🇾 PRY

**Europe (12):**

- 🇬🇧 ENG · 🇫🇷 FRA · 🇩🇪 GER · 🇪🇸 ESP · 🇵🇹 POR · 🇳🇱 NED
- 🇧🇪 BEL · 🇮🇹 ITA · 🇭🇷 CRO · 🇨🇭 CHE · 🇩🇰 DEN · 🇷🇸 SRB

**Africa (5):**

- 🇲🇦 MAR · 🇸🇳 SEN · 🇨🇲 CMR · 🇬🇭 GHA · 🇹🇳 TUN

**Asia/Oceania (5):**

- 🇯🇵 JPN · 🇰🇷 KOR · 🇮🇷 IRN · 🇸🇦 KSA · 🇦🇺 AUS

---

## Setup & Configuration

### Environment Variable

If you want to **update Supabase**, set `DATABASE_URL`:

```bash
# .env file
DATABASE_URL=postgresql://user:password@host:5432/fanwatch

# OR export it
export DATABASE_URL=postgresql://...

# Then run cleanup
npm run cleanup:wc2026 -- --dry-run
```

**Without `DATABASE_URL`:** Only local JSONL files are processed; Supabase is skipped.

### Local vs. Supabase

| Source                                     | Behavior                             |
| ------------------------------------------ | ------------------------------------ |
| **JSONL files** (`ingestion/data/<city>/`) | Always processed unless `--no-files` |
| **Supabase**                               | Only if `DATABASE_URL` is set        |

---

## Example Workflows

### Scenario 1: Preview Before Supabase Update

```bash
# 1. Check what would be deleted (dry-run, all cities)
npm run cleanup:wc2026 -- --dry-run

# Output shows statistics:
# Cleanup summary venuesRemoved=45 matchesRemoved=12 eventsRemoved=8 dryRun=true

# 2. If satisfied, execute the cleanup
npm run cleanup:wc2026
```

### Scenario 2: Cleanup Single City

```bash
# Preview changes for Miami only
npm run cleanup:wc2026 -- --dry-run --cities=miami

# If good, execute
npm run cleanup:wc2026 -- --cities=miami
```

### Scenario 3: Update Local Files Only (No Supabase)

```bash
# Maybe DATABASE_URL isn't set, or you want to test locally first
npm run cleanup:wc2026 -- --dry-run --no-files
npm run cleanup:wc2026 -- --no-files
```

### Scenario 4: Supabase-Only Cleanup

```bash
# Skip local JSONL files, update only Supabase
npm run cleanup:wc2026 -- --dry-run --no-files
npm run cleanup:wc2026 -- --no-files
```

---

## Output Interpretation

### Sample Dry-Run Output

```
World Cup 2026 cleanup {
  dryRun: true,
  teams: "ARG, AUS, BEL, BRA, ...",
  cities: "new-york, los-angeles, miami, ..."
}

Processing city { city: "new-york", dryRun: true }
City complete {
  city: "new-york",
  venuesRemoved: 2,
  matchesRemoved: 0,
  eventsRemoved: 1
}

Processing city { city: "los-angeles", dryRun: true }
City complete {
  city: "los-angeles",
  venuesRemoved: 5,
  matchesRemoved: 3,
  eventsRemoved: 0
}

...

Cleanup summary {
  venuesRemoved: 45,
  matchesRemoved: 12,
  eventsRemoved: 8,
  dryRun: true,
  mode: "DRY RUN (no changes made)"
}
```

### Interpreting Statistics

- **venuesRemoved**: Venues that only support non-WC teams (will be deleted)
- **matchesRemoved**: Matches where neither team is in WC 2026 (will be deleted)
- **eventsRemoved**: Events supporting only non-WC teams (will be deleted)
- **mode**: Shows whether changes will be made or if it's a dry-run

---

## Advanced Usage

### Integration with Existing Pipeline

The cleanup script is independent but works alongside your ingestion pipeline:

```bash
# 1. Run normal ingestion (adds all teams)
cd ingestion && npm run ingest -- all

# 2. Clean up non-WC teams
npm run cleanup:wc2026

# Result: JSONL files and Supabase have only WC 2026 teams
```

### Repeated Runs (Idempotent)

Safe to run multiple times. Subsequent runs delete 0 records:

```bash
npm run cleanup:wc2026 --dry-run
# First run: venuesRemoved=50

npm run cleanup:wc2026 --dry-run
# Second run: venuesRemoved=0 (already cleaned)
```

### Recovery / Rollback

If you need to restore deleted data:

1. **From JSONL:** Re-run ingestion: `npm run ingest`
2. **From Supabase:** Restore from backup or re-run ingestion with `SupabasePublisher`

---

## Technical Details

### Implementation

**File:** `ingestion/src/refresh/cleanupWorldCup2026.ts`

**Dependencies:**

- `fs` — Read/write JSONL files
- `postgres` — Supabase/Postgres driver
- `zod` schemas — Venue, Match, Event models

**Key Functions:**

- `shouldKeepVenue()` — Venue filter logic
- `shouldKeepMatch()` — Match filter logic
- `shouldKeepEvent()` — Event filter logic
- `cleanupLocalFiles()` — Process JSONL files
- `cleanupSupabase()` — Update Postgres/Supabase

### Database Queries

The script uses efficient SQL patterns:

```sql
-- Delete venues that only support non-WC teams
DELETE FROM venues
WHERE supports_teams IS NOT NULL AND supports_teams <> '{}'
  AND NOT (supports_teams && ARRAY[...WC teams...]::text[])

-- Delete matches between non-WC teams
DELETE FROM matches
WHERE home_team <> ALL(ARRAY[...WC teams...]::text[])
  OR away_team <> ALL(ARRAY[...WC teams...]::text[])

-- Delete events with non-WC teams
DELETE FROM events
WHERE teams IS NOT NULL AND teams <> '{}'
  AND NOT (teams && ARRAY[...WC teams...]::text[])
```

---

## Troubleshooting

### "DATABASE_URL not set, skipping Supabase cleanup"

This is normal if you haven't configured a Supabase connection. To enable:

```bash
export DATABASE_URL=postgresql://...
npm run cleanup:wc2026 -- --dry-run
```

### Script Times Out on Large Database

If cleanup is slow on a large Supabase database, try running on specific cities:

```bash
npm run cleanup:wc2026 -- --cities=new-york  # Smaller scope
```

### Want to Check What Would Be Deleted Before Executing?

Always use `--dry-run` first:

```bash
npm run cleanup:wc2026 -- --dry-run
# Review output...
npm run cleanup:wc2026  # Execute if satisfied
```

---

## Key Features

✅ **Dual-write support** — Updates both local JSONL and Supabase  
✅ **Dry-run mode** — Preview changes before executing  
✅ **Selective cleanup** — Clean specific cities or all at once  
✅ **Idempotent** — Safe to run multiple times  
✅ **Error handling** — Continues on per-file errors  
✅ **Detailed logging** — Shows exactly what changed  
✅ **Type-safe** — Full TypeScript strict mode

---

## Questions or Issues?

Check the implementation in [src/refresh/cleanupWorldCup2026.ts](./src/refresh/cleanupWorldCup2026.ts) for more details.
