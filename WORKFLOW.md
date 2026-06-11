# FanWatch — Workflow & Architecture Diagrams

Reference diagrams for the development team. All diagrams use
[Mermaid](https://mermaid.js.org/) and render natively on GitHub.

---

## 1. User Flow (MVP)

The end-to-end path a fan takes from landing to attending an event.

```mermaid
flowchart TD
    A([User visits FanWatch]) --> B{Location access?}
    B -- Allow --> C[Detect current location]
    B -- Deny --> D[Enter city / zip / neighborhood]
    C --> E[Select favorite team-s-]
    D --> E
    E --> F[Query venue discovery]
    F --> G[Ranking engine scores venues]
    G --> H[Recommendation engine personalizes]
    H --> I[Display ranked venues: map + list]
    I --> J{Apply team filter?}
    J -- Yes --> K[Filter by supporter base]
    J -- No --> L[Browse results]
    K --> L
    L --> M[Select venue]
    M --> N[View details: match, time, attendance, rating]
    N --> O[Get directions]
    O --> P([Attend event])
```

> The discovery query (step F) reads from the aggregated dataset produced by the
> ingestion pipeline (§3).

---

## 2. System Architecture (High Level)

```mermaid
flowchart LR
    subgraph Client
        WEB[Web App - responsive SPA]
    end

    subgraph Ingestion[Data Ingestion - Phase 0]
        SCRAPE[Scrapers / Source Connectors]
        ETL[Normalize · Geocode · Dedup · Enrich]
        SCHED[Scheduler - incremental refresh]
    end

    subgraph API[Backend API]
        GW[API Gateway]
        DISC[Discovery Service]
        RANK[Ranking Engine - configurable weights]
        REC[Recommendation Engine]
        VENUE[Venue Service]
        USER[User / Profile Service]
        BIZ[Business / Ads Service]
    end

    subgraph Data
        DB[(Primary DB - venues, users, events)]
        CACHE[(Cache - hot rankings)]
        GEO[(Geo Index - location search)]
    end

    subgraph External
        SRC[Source sites: Maps · Events · Social · Schedules]
        MAPS[Maps & Directions API]
        GEOCODE[Geocoding API]
    end

    SCHED --> SCRAPE
    SRC --> SCRAPE
    SCRAPE --> ETL
    ETL --> GEOCODE
    ETL --> DB
    ETL --> GEO

    WEB --> GW
    GW --> DISC
    GW --> VENUE
    GW --> USER
    GW --> BIZ
    DISC --> RANK
    DISC --> REC
    DISC --> GEO
    RANK --> CACHE
    RANK --> DB
    REC --> DB
    VENUE --> DB
    USER --> DB
    BIZ --> DB
    DISC --> GEOCODE
    WEB --> MAPS
```

---

## 3. Data Ingestion / Scraping Pipeline (Phase 0 — Foundation)

How raw, fragmented data becomes the clean dataset that powers discovery. Runs
on a schedule and refreshes incrementally.

```mermaid
flowchart TD
    subgraph Sources
        S1[Maps & places<br/>Google Places · OSM]
        S2[Event & ticketing sites<br/>viewing parties · fan zones]
        S3[Social media<br/>IG · TikTok · X · Reddit · FB]
        S4[Official match schedules]
        S5[Supporter-club / community pages]
    end

    S1 --> C[1. Collect<br/>scheduled scrapers / connectors]
    S2 --> C
    S3 --> C
    S4 --> C
    S5 --> C

    C --> N[2. Normalize<br/>map to canonical model]
    N --> G[3. Geocode<br/>resolve to geo point]
    G --> D[4. Deduplicate & match<br/>merge venues/events across sources]
    D --> E[5. Enrich<br/>images · ratings · team affiliation · engagement]
    E --> SC[6. Score<br/>feed ranking signals]
    SC --> P[7. Publish<br/>primary DB + geo index, refresh cache]

    P --> MON{{Data-quality monitor<br/>freshness · coverage · dedup rate}}
    MON -. triggers re-run .-> C
```

**What gets ingested:** cities & locations, venues (bars/pubs/restaurants/fan
parks), fan events (viewing parties, community watch events), match schedules
per competition, and enrichment signals (images, ratings, social engagement,
team affiliation).

---

## 4. Ranking Engine Pipeline

How a venue score is computed. Weights are configurable without a deploy.

```mermaid
flowchart TD
    IN[Candidate venues near user] --> S1[User Ratings - 30%]
    IN --> S2[Attendance - 25%]
    IN --> S3[Fan Engagement - 20%]
    IN --> S4[Team Fan Match - 15%]
    IN --> S5[Distance - 10%]
    S1 --> AGG[Weighted aggregation]
    S2 --> AGG
    S3 --> AGG
    S4 --> AGG
    S5 --> AGG
    CFG[(Config: weights)] -.tunes.-> AGG
    AGG --> SORT[Sort by score]
    SORT --> OUT[Ranked venue list]
```

---

## 5. Phased Delivery Roadmap

```mermaid
flowchart LR
    P0[Phase 0<br/>Data Foundation<br/>Scrape & ingest cities · venues<br/>bars · fan events · schedules<br/>normalize · geocode · dedup · enrich]
    P1[Phase 1<br/>Discovery · Search<br/>Rankings · Recommendations]
    P2[Phase 2<br/>Accounts · Reviews<br/>Check-ins · Communities]
    P3[Phase 3<br/>AI recs · Live crowd<br/>Event creation · Sponsorship<br/>International expansion]
    P0 --> P1 --> P2 --> P3
    P0 -. ongoing refresh .-> P0
```

---

## 6. Data Model (Core Entities)

```mermaid
erDiagram
    USER ||--o{ INTERACTION : has
    USER ||--o{ FAVORITE_TEAM : selects
    VENUE ||--o{ EVENT : hosts
    VENUE ||--o{ REVIEW : receives
    EVENT ||--o{ CHECKIN : records
    TEAM ||--o{ FAVORITE_TEAM : referenced
    EVENT }o--|| MATCH : shows
    SOURCE ||--o{ VENUE : provides
    SOURCE ||--o{ EVENT : provides

    USER {
        id PK
        location
        created_at
    }
    VENUE {
        id PK
        name
        address
        geo_point
        capacity
        rating_avg
        source_id FK
    }
    EVENT {
        id PK
        venue_id FK
        match_id FK
        start_time
        est_attendance
        source_id FK
    }
    TEAM {
        id PK
        name
        country
    }
    MATCH {
        id PK
        competition
        home_team
        away_team
        kickoff
    }
    SOURCE {
        id PK
        name
        type
        last_scraped_at
    }
```

> **Notes for engineers:**
> - The model is competition-agnostic (`MATCH.competition`), so the same schema
>   serves the World Cup launch and later leagues (Premier League, UCL, MLS,
>   La Liga) without restructuring.
> - `SOURCE` tracks provenance for every scraped record — required for dedup,
>   freshness checks, and honoring source terms / rate limits.
