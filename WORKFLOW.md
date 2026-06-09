# FanMatch — Workflow & Architecture Diagrams

Reference diagrams for the development team. All diagrams use
[Mermaid](https://mermaid.js.org/) and render natively on GitHub.

---

## 1. User Flow (MVP)

The end-to-end path a fan takes from landing to attending an event.

```mermaid
flowchart TD
    A([User visits FanMatch]) --> B{Location access?}
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

---

## 2. System Architecture (High Level)

```mermaid
flowchart LR
    subgraph Client
        WEB[Web App - responsive SPA]
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
        MAPS[Maps & Directions API]
        GEOCODE[Geocoding API]
        SOCIAL[Social Engagement Feeds]
    end

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
    RANK --> SOCIAL
```

---

## 3. Ranking Engine Pipeline

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

## 4. Phased Delivery Roadmap

```mermaid
flowchart LR
    P1[Phase 1<br/>Discovery · Search<br/>Rankings · Recommendations]
    P2[Phase 2<br/>Accounts · Reviews<br/>Check-ins · Communities]
    P3[Phase 3<br/>AI recs · Live crowd<br/>Event creation · Sponsorship<br/>International expansion]
    P1 --> P2 --> P3
```

---

## 5. Data Model (Core Entities)

```mermaid
erDiagram
    USER ||--o{ INTERACTION : has
    USER ||--o{ FAVORITE_TEAM : selects
    VENUE ||--o{ EVENT : hosts
    VENUE ||--o{ REVIEW : receives
    EVENT ||--o{ CHECKIN : records
    TEAM ||--o{ FAVORITE_TEAM : referenced
    EVENT }o--|| MATCH : shows

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
    }
    EVENT {
        id PK
        venue_id FK
        match_id FK
        start_time
        est_attendance
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
```

> **Note for engineers:** the data model is competition-agnostic (`MATCH` carries
> a `competition` field), so the same schema serves the World Cup launch and
> later leagues (Premier League, UCL, MLS, La Liga) without restructuring.
