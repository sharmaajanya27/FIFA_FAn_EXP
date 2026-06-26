---
title: FanWatch AI Agent Guide
---

# FanWatch AI Agent Guide

**FanWatch** is a location-based soccer fan experience platform helping fans discover the best venues to watch matches. This guide accelerates AI-assisted development by documenting project structure, patterns, and conventions.

> **Start here:** [README.md](./README.md) · Full architecture: [ARCHITECTURE.md](./ARCHITECTURE.md) · Workflow & diagrams: [WORKFLOW.md](./WORKFLOW.md) · PRD: [PRD.md](./PRD.md)

---

## Quick Facts

| Property          | Value                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| **Tech Stack**    | TypeScript (Node.js 20+), Next.js 16, React 19, Postgres/Supabase     |
| **Module Format** | ESM (`import` / `export`) across all packages                         |
| **TypeScript**    | Strict mode enabled; `noUncheckedIndexedAccess: true`                 |
| **Packages**      | 3 monorepo packages: `ingestion/`, `api/`, `frontend/`                |
| **Storage**       | Pluggable via interfaces (local JSONL in dev, Postgres in production) |
| **Development**   | No tests; validation via Zod (ingestion) and runtime helpers (api)    |

---

## The Three Packages

### 1. `ingestion/` — Phase 0 Data Pipeline

**Role:** Scrape, normalize, geocode, dedup, enrich, and score venues/matches/events into a clean dataset.

| Item              | Details                             |
| ----------------- | ----------------------------------- |
| **Entry**         | `src/cli/run.ts` (orchestrator)     |
| **Runtime**       | Node.js CLI                         |
| **Dev command**   | `cd ingestion && npm run ingest`    |
| **Build command** | `cd ingestion && npm run build`     |
| **Type check**    | `cd ingestion && npm run typecheck` |

**Key files:**

- `src/models/canonical.ts` — Zod schemas (Venue, Match, Event, GeoPoint) define the canonical data model
- `src/config/env.ts` — Environment configuration (DATA_DIR, DATABASE_URL, etc.)
- `src/pipeline/` — Processing stages: collect → normalize → geocode → dedup → merge → enrich → score → publish

**Pattern:** Each pipeline stage is a pure function: `(input) => Promise<output>`.

---

### 2. `api/` — Discovery & Engagement API

**Role:** Serve the discovery API (search, rank, recommend venues), handle engagement writes (reviews, checkins, predictions), provide admin analytics.

| Item              | Details                                                               |
| ----------------- | --------------------------------------------------------------------- |
| **Entry**         | `src/http/server.ts` (Node HTTP server)                               |
| **Runtime**       | Node.js HTTP server (dev: `tsx watch`, prod: replaceable with Lambda) |
| **Dev command**   | `cd api && npm run dev`                                               |
| **Start command** | `cd api && npm start`                                                 |
| **Build command** | `cd api && npm run build`                                             |
| **Type check**    | `cd api && npm run typecheck`                                         |

**Key files:**

- `src/container.ts` — Dependency injection: wires Repository, Store, Services, and Handlers
- `src/http/types.ts` — Transport-agnostic request/response types
- `src/http/server.ts` — HTTP routing and request binding
- `src/data/repository.ts` — Read interface (venues, matches, events)
- `src/store/jsonStore.ts` — Write interface (Store, Collection CRUD)
- `src/domain/models.ts` — Read models (Venue, Match, Event, RankedVenue)
- `src/domain/engagement.ts` — Engagement models (User, Review, CheckIn, Prediction, plus the v1 anonymous Event/Venue Rsvp/Presence/Vibe/Review + vibe intensity helpers)
- `src/services/eventEngagement.ts`, `src/services/venueEngagement.ts` — **v1 anonymous engagement** (RSVP/presence, 0–10 vibe slider, reviews); the venue one is also a discovery overlay feeding ranking
- `src/handlers/` — Handler functions (one per endpoint or feature)
- `src/services/` — Business logic (DiscoveryService, RankingService, etc.)
- `src/config/env.ts` — Environment variables with sensible defaults

**Storage Seams:**

- `DATABASE_URL` unset → `FileRepository` (reads JSONL from `../ingestion/data/<city>/`) + `JsonStore` (writes to `data/engagement/<name>.json`)
- `DATABASE_URL` set → `PgRepository` (queries Postgres) + `PgStore` (upserts to Postgres)
- Services depend on interfaces, never concrete backends → **storage is fully swappable**

**Auth:**

- **v1 is account-free.** The live engagement (RSVP/presence, vibe slider,
  reviews) is keyed to a **device-scoped anonymous id** (`anonId`, stored in the
  browser's localStorage — see `frontend/src/lib/anon.ts`), not a user account.
  The account-gated features below are built but dormant behind the frontend
  `features.ts` flags.
- **Request-level:** Supabase Anonymous Auth. Every browser visitor gets a
  signed ES256 JWT (no login). Frontend sends as `X-Supabase-Auth` header.
  Backend verifies via JWKS (`jose` library). `SUPABASE_URL` unset → disabled.
- **User-level (dev stub):** `fmtok_<userId>` token for account-gated writes.
  `AuthService.resolveUser()` parses token, looks up user.

**Handler Pattern:**

```ts
// Transport-agnostic
const myHandler = (c: Container) => async (req: ApiRequest) => {
  const userId = requireUser(req); // throws ApiError if missing
  const radius = requireFloat(req, "radius", 5000);
  const results = await c.services.discovery.search({ userId, radius });
  return { status: 200, body: results };
};
```

---

### 3. `frontend/` — Next.js Web App

**Role:** Discovery map/list UI, ranking/recommendation views, programmatic SEO landing pages, admin analytics dashboard.

| Item              | Details                                     |
| ----------------- | ------------------------------------------- |
| **Entry**         | `src/app/page.tsx` (Next.js App Router)     |
| **Runtime**       | Next.js 16 (React 19) with Leaflet for maps |
| **Dev command**   | `cd frontend && npm run dev`                |
| **Build command** | `cd frontend && npm run build`              |
| **Start command** | `cd frontend && npm start`                  |
| **Type check**    | `cd frontend && npm run typecheck`          |
| **Lint**          | `cd frontend && npm lint`                   |

**Key files:**

- `src/app/` — Next.js App Router pages (layout, discovery, `/watch/[city]`, `/venue/[city]/[id]`)
- `src/components/` — React components (MapView, VenueList, EventsPanel, etc.)
- `src/lib/api.ts` — Client-side API fetching (calls `api/`)
- `src/lib/types.ts` — Frontend types (mirrors API domain models)
- `public/cities/` — City-specific static assets (flags, themes, etc.)

**SEO & Programmatic Landing Pages:**

- `/watch` → all cities
- `/watch/[city]` → city-specific discovery
- `/watch/[city]/[team]` → team-filtered discovery
- `/venue/[city]/[id]` → venue detail page
- Server-rendered with JSON-LD, sitemap, robots.txt

**Admin Routes:**

- `/admin` — traffic analytics dashboard (admin-gated by `ADMIN_EMAILS` in `api/`)

---

## Development Workflow

### Add a New Feature

1. **Identify the layer:** Backend feature? → `api/`. Data transformation? → `ingestion/`. Frontend? → `frontend/`.

2. **Backend service** (api/):
   - Create service in `src/services/<feature>.ts` (depends on `Repository`, `Store`, or other services)
   - Create handler(s) in `src/handlers/<feature>.ts` (curried function receiving `Container`)
   - Wire into `src/container.ts` → add to `Container` interface and `buildContainer()`
   - Add route in `src/http/server.ts`

3. **Frontend** (frontend/):
   - Create component in `src/components/<feature>.tsx`
   - Call API via `src/lib/api.ts`
   - Wire into pages (`src/app/`)

4. **Data transformation** (ingestion/):
   - Add Zod schema to `src/models/canonical.ts` if new type
   - Add pipeline stage to `src/pipeline/` or extend existing stage
   - Call from `src/cli/run.ts`

### Common Tasks

| Task                     | Where                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Add an API endpoint      | Create handler in `api/src/handlers/`, wire in `container.ts`, add route in `http/server.ts`                                              |
| Add engagement data type | Add model to `api/src/domain/engagement.ts`, create service + handlers, wire into container                                               |
| Add business logic       | Create service in `api/src/services/`, inject dependencies (Repository, Store, other services)                                            |
| Add frontend page        | Create `.tsx` in `api/src/app/`, add client components in `src/components/`                                                               |
| Transform ingestion data | Add/modify stage in `ingestion/src/pipeline/`, update `canonical.ts` Zod schema if needed                                                 |
| Add configuration        | Add to `src/config/env.ts` with sensible defaults; load from `process.env`                                                                |
| Auth-gate an endpoint    | Use `requireUser()` or `requireAdmin()` helper in handler. Request-level auth (Supabase JWT) is automatic for all routes except `/health` |
| Swap storage backends    | Implement `Repository` or `Store` interface; services unchanged                                                                           |

---

## Key Architectural Patterns

### Pattern 1: Dependency Injection (Container)

Services and handlers are wired once at startup via `buildContainer()`. Handlers receive a `Container` that provides all dependencies.

```ts
// In container.ts
export const buildContainer = (env: Env, repo: Repository, store: Store) => ({
  services: {
    discovery: new DiscoveryService(repo, store),
    ranking: new RankingService(repo),
  },
});

// In handler
const myHandler = (c: Container) => async (req: ApiRequest) => {
  const result = await c.services.discovery.search(...);
  return { status: 200, body: result };
};
```

**Why:** Services are pure and testable; storage backends are swappable; handlers are transport-agnostic.

### Pattern 2: Storage Seams (Interface-Based Switching)

All I/O goes through interfaces. Local dev uses files; production uses Postgres. Services never know which backend runs.

```ts
// Repository interface (read)
interface Repository {
  listCities(): Promise<string[]>;
  venues(citySlug: string): Promise<Venue[]>;
}

// Store interface (write)
interface Store {
  collection<T>(name: string): Collection<T>;
}
```

**Why:** Same code runs locally and in production. Add new backends without touching services.

### Pattern 3: Request Validation via Helpers

Handlers use tiny helpers to extract and validate request fields. Helpers throw `ApiError` on failure.

```ts
const userId = requireUser(req); // throws if missing
const radius = requireFloat(req, "radius", 5000); // throws if invalid, defaults to 5000
const filters = bodyField<Filters>(req, "filters", {
  /* defaults */
});
```

**Why:** Consistent error handling; explicit validation; no middleware chain.

### Pattern 4: Overlay Composition

Services can chain multiple overlays to augment data without invasive inheritance.

```ts
// In buildContainer
const venueOverlay = new CompositeVenueOverlay([
  reviewsOverlay,
  sponsorshipOverlay,
]);

// In handler
const rankedVenues = await c.services.ranking.rank(venues, venueOverlay);
```

**Why:** Non-invasive composition; services stay focused; overlays can be toggled on/off.

---

## TypeScript Conventions

| Setting                      | Value                  | Notes                                        |
| ---------------------------- | ---------------------- | -------------------------------------------- |
| **Target**                   | ES2022                 | Modern async/await, nullish coalescing       |
| **Module**                   | NodeNext               | Explicit ESM with proper Node resolution     |
| **Strict**                   | true                   | Enforces strict null checks, no implicit any |
| **noUncheckedIndexedAccess** | true                   | Indexing maps returns `T \| undefined`       |
| **lib**                      | ES2022, dom (frontend) | Standard types + DOM for frontend            |

**Import Style:**

```ts
// ✅ Do this (ESM)
import { Repository } from "../data/repository.ts";
import type { Venue } from "../domain/models.ts";

// ❌ Not this (CommonJS)
const { Repository } = require("../data/repository");
```

**Nullable Types:**

```ts
// ✅ Be explicit
interface Result {
  venue: Venue | null;
  error?: ApiError;
}

// ❌ Avoid implicit any
const user = getUserById(123); // must have explicit return type
```

**Interfaces for Contracts:**

```ts
// ✅ Storage backends implement interfaces
interface Store {
  collection<T>(name: string): Collection<T>;
}

// Services depend on the interface, not the implementation
class EngagementService {
  constructor(private store: Store) {}
}
```

---

## Running Locally

**Prerequisites:** Node.js 20+, npm/yarn

**Setup:**

```bash
# Install dependencies in each package
cd api && npm install
cd ../frontend && npm install
cd ../ingestion && npm install

# Optional: Set DATABASE_URL to use Postgres
export DATABASE_URL=postgres://...

# Optional: Set SUPABASE_URL to enable request-level JWT verification
export SUPABASE_URL=https://<ref>.supabase.co
```

**Development:**

```bash
# Terminal 1: Ingestion (optional—if you want fresh data)
cd ingestion && npm run ingest

# Terminal 2: API
cd api && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

**Open browser:**

- Frontend: http://localhost:3000
- API docs: See `api/README.md` for endpoints
- Admin dashboard: http://localhost:3000/admin (gated by `ADMIN_EMAILS`)

---

## Debugging Tips

- **API errors:** Check `ApiError` in handlers; they follow the pattern `{ status, message }`
- **Storage backend:** `FileRepository` is used if `DATABASE_URL` is unset; `PgRepository` if set
- **Request auth:** All API requests (except `/health`) need `X-Supabase-Auth` header with a valid Supabase JWT. If `SUPABASE_URL` is unset, verification is disabled.
- **User auth token:** Engagement writes use `fmtok_<userId>` (e.g., `fmtok_user-123`) as `Authorization: Bearer` header
- **Admin access:** User email must be in `process.env.ADMIN_EMAILS` (comma-separated, lowercased)
- **Config defaults:** Check `src/config/env.ts` for all available environment variables and their defaults
- **Type errors:** Use `npm run typecheck` in any package to catch TypeScript issues early

---

## Project Conventions Summary

1. **One interface, multiple implementations** — Repository, Store all follow this pattern
2. **Handlers are curried** — receive Container once, then handle requests
3. **No tests yet** — patterns are present (Zod schemas in ingestion, manual validation in API) if you add them
4. **ESM throughout** — use `import` / `export`, not `require`
5. **Strict TypeScript** — catch bugs at compile time; no implicit any
6. **Config via environment variables** — sensible defaults in `env.ts`
7. **Minimal frameworks** — handlers and services are plain functions, not framework-specific

---

## Useful Commands Quick Reference

```bash
# API
cd api && npm run dev         # Start development server
cd api && npm run typecheck   # Type-check without building
cd api && npm run build       # Build for production
cd api && npm start           # Run built version

# Frontend
cd frontend && npm run dev    # Start Next.js dev server
cd frontend && npm run build  # Build for production
cd frontend && npm run start  # Start production server

# Ingestion
cd ingestion && npm run ingest      # Run data pipeline
cd ingestion && npm run migrate     # Run database migrations
cd ingestion && npm run typecheck   # Type-check
```

---

## Links to Detailed Documentation

- [README.md](./README.md) — Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Deep dive into the storage seams, abstractions, and production target
- [WORKFLOW.md](./WORKFLOW.md) — User flow and system architecture diagrams
- [PRD.md](./PRD.md) — Product requirements and vision
- [api/README.md](./api/README.md) — API endpoints and development notes
- [frontend/README.md](./frontend/README.md) — Frontend architecture and components
- [ingestion/README.md](./ingestion/README.md) — Data pipeline documentation
- [ingestion/sources.md](./ingestion/sources.md) — Data sources and scraping details
