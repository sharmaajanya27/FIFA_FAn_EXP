# FanWatch — Product Requirements Document

> **Status:** Draft v1.0
> **Last updated:** 2026-06-09
> **Owner:** Product

---

## 1. Overview

FanWatch helps soccer fans **find their people** — connecting fans with the team
crowds, venues, and fan events that turn every World Cup match into a shared
celebration. It's built for supporters who want more than a bar: their team's
crowd, their community, their place, and the match-day feeling of belonging.

**Vision.** To bring soccer fans together by helping them find their people,
their place, and their shared World Cup experience wherever they are in the U.S.,
Canada, and Mexico — turning every match into a shared celebration by connecting
fans with the communities and venues that make the game come alive. The scalable
global vision: to become the **global home for fans to discover where to watch,
who to cheer with, and how to celebrate the teams they love.**

**Taglines.** *Find your fans. Feel at home.* · *Where fans find their crowd.* ·
*You will never watch alone.*

Discovering the best venues and fan events is **how** FanWatch delivers that
belonging: the platform aggregates bars, pubs, fan zones, viewing parties, and
community watch events, then ranks them by popularity, atmosphere, team support,
reviews, and fan engagement so fans can find the right crowd fast.

> **Working name.** The product ships under the working name **FanWatch**.
> Candidate names (GoalCrowd, MatchMates, WatchUnited, TeamRoar) are still under
> consideration and the final brand is not yet decided.

### Positioning note

FanWatch is a **community-and-belonging product, not just a venue finder** — the
lead promise is helping fans find their people, with venue and fan-event
discovery as the means to that end. For **V1 the focus is the World Cup and
national teams** across the U.S., Canada, and Mexico (club competitions and other
sports are out of near-term scope). It launches during the World Cup for maximum
reach, but is built as a **year-round** platform that later extends to the
Premier League, UEFA Champions League, Major League Soccer, La Liga, and other
competitions — so the business stays viable continuously rather than only every
four years. The scalable vision is to become the global home for fans to find
where to watch, who to cheer with, and how to celebrate the teams they love.

---

## 2. Problem Statement

**User.** Soccer fans in the U.S. — including local U.S., Canada, and Mexico
supporters, immigrants, travelers, and fans following their home team or favorite
national team.

**Need.** To find a *community* to watch matches with — people to cheer with,
celebrate goals and wins with, and share the World Cup experience with.

**Insight.** Fans feel more connected, more at home, and more emotionally
involved when they're surrounded by fellow fans who share the same nation/team
pride, culture, and passion. As one fan puts it: *"I don't just need a bar. I need
my people, my team crowd, and the feeling of belonging."*

The hard part is finding that crowd. Today the signals that lead a fan to it —
which venues are showing matches, which support their favorite team, which have
the best atmosphere, which events are popular, and where official or unofficial
fan gatherings are taking place — are fragmented across social media, Google
searches, event sites, and local communities. **FanWatch centralizes them into
one platform** so fans can find their people, not just a place; a core part of
the product is an automated **data aggregation layer** that scrapes and ingests
this fragmented information (see §5).

---

## 3. Target Audience

### Primary users — national-team supporters looking for their crowd
- Local U.S., Canada, and Mexico supporters
- Immigrants and expats following their home nation
- Travelers and visiting fans during the tournament
- Fans supporting a favorite national team
- Supporter groups and fan communities

### Secondary users
- Bars
- Pubs
- Restaurants
- Event organizers
- Sponsors

---

## 4. Core User Journey

1. User visits FanWatch.
2. User allows location access **or** enters city manually.
3. User selects favorite team(s).
4. Platform displays nearby watch locations.
5. User views rankings and recommendations.
6. User selects a venue.
7. User gets directions and attends the event.

---

## 5. Data Aggregation & Ingestion (Phase 0 — Foundation)

Discovery is only as good as the underlying data. Before and alongside the MVP,
FanWatch runs an automated ingestion layer that **scrapes and aggregates** the
raw inventory the rest of the platform depends on.

### 5.1 What we ingest

- **Cities & locations** — supported metros, neighborhoods, zip/geo boundaries
- **Venues** — bars, pubs, restaurants, fan parks
- **Fan events** — viewing parties, community watch events, official fan zones
- **Match schedules** — fixtures per competition (World Cup first, then leagues)
- **Enrichment signals** — venue images, hours, ratings, social engagement,
  team/supporter affiliations

### 5.2 Sources

- Maps & places providers (e.g. Google Places, OSM) for venues and geo data
- Event platforms and ticketing sites for viewing parties / fan events
- Social media (Instagram, TikTok, X, Reddit, Facebook) for fan gatherings and
  engagement signals
- Official competition schedules for fixtures
- Supporter-club and community pages for team-affiliation signals

### 5.3 Ingestion pipeline

1. **Collect** — scheduled scrapers / connectors pull raw records per source.
2. **Normalize** — map disparate schemas into the canonical FanWatch model.
3. **Geocode** — resolve every venue/event to a geo point for radius search.
4. **Deduplicate & match** — merge the same venue/event across sources into one
   record.
5. **Enrich** — attach images, ratings, team affiliations, engagement counts.
6. **Score** — feed normalized signals into the ranking engine (§6.5 weights).
7. **Publish** — write to the primary DB + geo index, refresh caches.

### 5.4 Operational requirements

- Scheduled, incremental refresh (events/schedules are time-sensitive).
- Source connectors are **pluggable** so new cities/sources/competitions can be
  added without rearchitecting.
- Respect source terms of service, rate limits, and robots directives; cache
  responsibly.
- Data-quality monitoring: freshness, dedup rate, geocode success, coverage per
  city.

> See [`WORKFLOW.md`](./WORKFLOW.md) §3 for the ingestion pipeline diagram.

---

## 6. MVP Features

### 6.1 Location-Based Discovery

Users can:
- Detect current location
- Search by city
- Search by zip code
- Search by neighborhood

Output:
- Nearby bars
- Nearby pubs
- Fan parks
- Viewing parties
- Community events

### 6.2 Venue Listings

Each venue should display:
- Name
- Address
- Distance
- Match being shown
- Event start time
- Venue images
- Estimated attendance
- Team supporters expected
- User rating

### 6.3 Interactive Map

- Map view
- List view
- Search radius
- Directions link
- Nearby recommendations

### 6.4 Team-Based Filtering

Users can filter venues by supporter base:
- Argentina, Brazil, England, USA, Spain, Germany, France
- Other participating teams

### 6.5 Venue Ranking Engine

The platform ranks venues based on multiple factors.

**Ranking signals**
- Number of attendees
- User ratings
- Repeat visitors
- Event popularity
- Social media engagement
- Team-specific fan concentration
- Venue capacity
- Distance from user

**Example score formula**

```
Venue Score =
  30% × User Ratings +
  25% × Attendance +
  20% × Fan Engagement +
  15% × Team Fan Match +
  10% × Distance
```

> The ranking algorithm must be **configurable** (weights tunable without a code
> deploy).

### 6.6 Recommendation Engine

Provides personalized recommendations.

> _Example:_ "If you support Argentina and are located in Jersey City, these are
> the top venues nearby."

Factors:
- Favorite team
- Location
- Past venue interactions
- Popularity score

---

## 7. Fan Engagement Features (Phase 2)

- Venue check-ins
- Fan profiles
- Match predictions
- Team communities
- Live venue crowd levels
- Fan photos
- Venue reviews

---

## 8. Business Model

### 8.1 Bar Advertising

Bars can:
- Promote events
- Feature listings
- Buy sponsored placements
- Run promotions

**Revenue streams**
- Sponsored venues
- Featured listings
- Banner advertisements
- Event promotion packages

### 8.2 Premium Business Accounts

Venue owners can:
- Claim a venue
- Update information
- Promote events
- Access an analytics dashboard

Monthly subscription model.

---

## 9. User Acquisition Strategy

### Digital marketing
**Channels:** Instagram, TikTok, Facebook, Reddit, X, YouTube Shorts
**Content:** Match-day venue recommendations, fan reactions, city guides, venue
rankings

### Community partnerships
Partner with local supporter clubs, fan organizations, soccer communities, and
tournament watch groups.

### Referral program
Users earn rewards for:
- Inviting friends
- Venue reviews
- Event check-ins

---

## 10. Success Metrics

### User metrics
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- Session duration
- Venue click-through rate (CTR)

### Business metrics
- Number of listed venues
- Number of sponsored venues
- Advertising revenue
- Customer acquisition cost (CAC)

### Engagement metrics
- Check-ins
- Reviews
- Shares
- Referrals

---

## 11. Future Roadmap

| Phase | Focus |
|-------|-------|
| **Phase 0** | **Data foundation: scraping & ingestion of cities, venues, bars, fan events, and match schedules; normalization, geocoding, dedup, enrichment** |
| **Phase 1** | Venue discovery, location search, rankings, recommendations |
| **Phase 2** | User accounts, reviews, check-ins, fan communities |
| **Phase 3** | AI recommendations, live crowd estimation, event creation, sponsorship marketplace, international expansion |

> Phase 0 underpins Phase 1 — discovery, rankings, and recommendations all read
> from the aggregated dataset. It continues to run as an ongoing operational
> service after launch (incremental refresh), not a one-time effort.

---

## 12. Out of Scope (for MVP)

- Native mobile apps (web-first; responsive)
- In-app payments / ticketing
- Real-time crowd sensing hardware
- Multi-language localization (deferred to expansion phase)

See [`WORKFLOW.md`](./WORKFLOW.md) for the system and user-flow diagrams the
development team should reference.
