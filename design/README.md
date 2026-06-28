# FanWatch — UX Design Concept (v1)

> **Vision (from the deck):** Help soccer fans **find their people** — the team
> crowds, venues, and fan events that turn every World Cup match into a shared
> celebration. _Find your fans. Feel at home. You'll never watch alone._

This folder holds the **design direction** for the V1 redesign — a catchy, simple,
community‑first experience built around one job‑to‑be‑done:

> _"I don't just need a bar. I need my people, my team crowd, and the feeling of belonging."_

**Open the prototype:** [`fanwatch-prototype.html`](./fanwatch-prototype.html) — double‑click it,
or run `open design/fanwatch-prototype.html` on macOS. It's a self‑contained,
clickable mock (no build, no API) using the same Leaflet map engine as the app.

---

## 1. Three design principles

1. **Belonging over browsing.** Every screen answers "where are *my people*?"
   first, "which bar?" second. Pins are **team crowds**, not generic dots.
2. **Minimum clicks.** You can see your crowd in **0–1 taps**. Three controls
   only: **📍 Near me · City · Team**. Everything else is progressive disclosure.
3. **Playful, alive, local.** The map *moves* — crowds pulse, your team's pins
   pop, watch parties throw confetti, and the city's own skyline + footballs
   color the scene.

---

## 2. Minimum‑click flow (the big simplification)

**Today** the discovery bar exposes ~9 controls: city, team, venue kind (×6),
radius, origin mode (downtown/stadium/custom), place search, top‑nav
(discover/live/community), view (map/list), and a recs/events tab.

**V1 redesign** collapses the default surface to **3 controls**:

| Step | Action | Clicks |
|---|---|---|
| 1 | App opens → location detected (or one tap **📍 Near me**) | 0–1 |
| 2 | Tap your **team flag** (single flag row) | 1 |
| 3 | Crowds + tonight's watch parties render instantly | 0 |
| 4 | Tap a pin/card → **I'm going** (confetti) | 1 |

So: **your crowd in ≤1 tap, committed to a watch party in ≤3.** Power filters
(radius, venue type, stadium origin) live behind a single **"More"** chip so the
default stays clean — exactly the deck's "keep minimum City/Team/Use my location,
remove others."

---

## 3. Fan events are first‑class (not a tab)

The deck calls out fan events as a primary surface. So they get **two** dedicated
treatments instead of a hidden tab:

- **Map:** watch parties are distinct **pennant spotlight pins** (🎉), visually
  louder than venue pins, in a hot accent color.
- **Bottom rail:** a persistent, swipeable **"Tonight's watch parties near you"**
  strip — team flags, kickoff time, "*320 going*", venue, and a one‑tap
  **I'm going**. It's always on screen, riding above the map.

---

## 4. The playful map system

| Element | Treatment |
|---|---|
| **Base map** | Stylized CARTO *Voyager* tiles — cleaner & warmer than raw OSM gray |
| **Venue pin** | Circular **team‑flag badge** with a team‑colored ring + a small "going" count chip |
| **Live now** | Buzzing venues get a **pulsing halo** (animated ring) |
| **Team focus** | Selecting a team makes matching crowds **pop & bounce**; others dim |
| **Watch‑party pin** | **Pennant spotlight** marker in the hot event color |
| **You are here** | Soft pulsing locator |
| **Local graphics** | City **skyline silhouette** + floating **footballs** tinted by the city accent (reuses your existing `cityThemes` language) |
| **Micro‑joy** | Pins drop in staggered; **I'm going → confetti**; counts tick up live |

Color system: energetic green primary (`#16c172`, your accent), a hot **magenta**
(`#ff5da2`) reserved for fan events so they always stand out, soft glass surfaces
with blur, big rounded cards.

---

## 5. Screen inventory (in the prototype)

1. **Discover** — full‑bleed playful map, 3‑control top bar, tagline pill,
   watch‑party rail, "More" progressive filters.
2. **Detail sheet** — slides up on pin/card tap: team crowd ("142 Argentina fans
   going"), atmosphere, avatars of who's going, **I'm going** + **Directions**.
3. **Team focus state** — map recolors to your team; header becomes
   "*N {Team} fans near you tonight*".

---

## 6. How this maps back to the deck

| Deck ask | In this design |
|---|---|
| Find your people / belonging is the core | Pins = team crowds; copy + sheet center on "your people" |
| Minimum filters (City/Team/Location) | Default surface = exactly those 3; rest behind "More" |
| Fan events important | First‑class pennant pins **and** a persistent watch‑party rail |
| Cool, playful, location‑aware map | Stylized tiles, flag/crowd pins, pulses, confetti, city skyline + footballs |
| Live scores (no logos) | Slot reserved as a lightweight text ticker (not in this mock) |
| Simple, intuitive, first‑user ready | 3 taps end‑to‑end; zero chrome by default |

---

## 7. Next step (when you like the direction)

Port the prototype's visual language into the real app with low risk:

- Swap `MapView.tsx` dot markers → **flag/crowd `divIcon`** pins + pulse CSS.
- Change the base `TileLayer` URL → CARTO Voyager.
- Promote `EventsPanel` → a sticky **watch‑party rail** on `page.tsx`.
- Collapse the control bar to **City · Team · 📍**, move the rest behind a "More" disclosure.

No backend or data‑model changes required — it's a presentation‑layer redesign.

---

## 8. Production maps & geocoding — our own stack ($0 / load)

The shipping app used **unkeyed OpenStreetMap raster tiles** + **public
Nominatim** geocoding. Both are fine for a demo but are rate‑limited and not
licensed for production traffic. We replaced them with a self‑hosted stack we
fully own.

**Proof it works:** [`fanwatch-map-maplibre.html`](./fanwatch-map-maplibre.html)
— a runnable map rendered by **MapLibre GL** from **Protomaps PMTiles** with our
own Day/Night FanWatch vector style. No API key, no SDK, no per‑load fee.

### Why this stack

- **Renderer — MapLibre GL JS:** open‑source (BSD), no token, WebGL vector maps.
- **Tiles — Protomaps PMTiles:** the whole basemap is **one file** served over
  plain HTTP **range requests** from **S3 + CloudFront** (already our CDN). OSM
  data, commercial‑use OK.
- **Style — ours:** a hand‑written vector style (`buildStyle()`), so cartography
  (brand colors, Day/Night) is ours to control — not a vendor preset.

### Cost comparison (verified 2026)

| Option | Commercial free tier | Cost at scale | Key? | Verdict |
|---|---|---|---|---|
| Mapbox GL | ≤50k loads/mo | paid per load after | yes | vendor lock, per‑load |
| MapTiler | **non‑commercial only** | $25/mo+ commercial | yes | logo required |
| Stadia Maps | **commercial not on free** | $20/mo+ | yes | not free for us |
| AWS Location | 500k tiles/mo (3 mo) | paid after | yes | time‑boxed free |
| **Self‑host (MapLibre + PMTiles)** | **unlimited** | **S3 storage + egress only** | **no** | **chosen** |

A 30‑metro PMTiles extract is a few hundred MB; on CloudFront that's pennies/mo
and **$0 per map load** — it fits the existing S3 + CloudFront + free‑tier story.

### Frontend wiring (in‑repo, default OFF)

- `components/MapViewGL.tsx` — MapLibre engine, same props as `MapView`.
- `lib/mapConfig.ts` — engine + tile/glyph URLs. Tiles default to a **same‑origin**
  path (`/maps/basemap.pmtiles`); prod points at our S3 + CloudFront.
- Flip with `NEXT_PUBLIC_MAP_ENGINE=maplibre`. Leaflet stays the default so the
  live app is unchanged until we cut over.
- CSP already extended for MapLibre (`worker-src blob:`, tile/glyph origins).
- **Tiles must be served same‑origin or with CORS** — the public Protomaps demo
  bucket sends no `Access-Control-Allow-Origin` header, so it can't be fetched
  cross‑origin from a browser. (Verified end‑to‑end: 50 venue markers + popups
  rendering over our own basemap.)

### Dev: make a local same‑origin tile extract

```bash
brew install pmtiles
cd frontend
# A metro‑area extract (here Jersey City / NYC) → served same‑origin by Next.
pmtiles extract https://demo-bucket.protomaps.com/v4.pmtiles \
  public/maps/basemap.pmtiles --bbox=-74.30,40.45,-73.65,40.95
# (public/maps/*.pmtiles is gitignored)
NEXT_PUBLIC_MAP_ENGINE=maplibre npm run dev
```

### Producing our own tiles for production (one‑time + on refresh)

```bash
# 1. Build a metro extract from OSM with Planetiler (or pull a Protomaps build)
java -jar planetiler.jar --download --area=<region> --output=fanwatch.pmtiles
# 2. Upload to S3, serve via CloudFront (with CORS enabled)
aws s3 cp fanwatch.pmtiles s3://fanwatch-maps/basemap.pmtiles
# 3. Point the app at it
NEXT_PUBLIC_MAP_PMTILES_URL=https://maps.fanwatch.app/basemap.pmtiles
NEXT_PUBLIC_MAP_ENGINE=maplibre
```

### Geocoding — in‑house gazetteer (no Nominatim for the hot path)

Search‑by‑zip/neighborhood now resolves from data **we already own**:

- `ingestion` `npm run gazetteer` extracts **postcodes + localities** (with
  venue‑centroid coordinates) from published venues → `data/<city>/gazetteer.jsonl`.
  Current yield: **5,627 entries** across 29 metros (79–82% address coverage in
  US/UK markets).
- `api` `LocalGazetteer` loads those + metro/stadium anchors; `GeocodeService`
  tries it **first** (instant, $0, no rate limit) and only falls back to the
  remote provider for the long tail. City‑scoped so a London "Camden" never
  resolves to Camden, NJ.

---

## 9. Beyond the map — three alternative paradigms

The map answers **"what's around me?"** But the deck's job‑to‑be‑done is
**"find my people."** Space is only one lens on belonging. These three runnable
prototypes each lead with a *different* lens — and each wins for a different fan.

| Prototype | Lens | Leads with | Best for |
|---|---|---|---|
| [`fanwatch-feed.html`](./fanwatch-feed.html) | **Social** | Faces, buzz, who's going | Locals & neutrals, "show me energy" |
| [`fanwatch-team-home.html`](./fanwatch-team-home.html) | **Identity** | Your nation, your colors | Supporters, diaspora, away‑from‑home |
| [`fanwatch-tonight.html`](./fanwatch-tonight.html) | **Time** | Kickoffs, a plan for the night | Planners, travelers, multi‑match days |

### A — The Crowd Feed (`fanwatch-feed.html`)
A vertical, alive stream of **team crowds** and **watch parties**, ranked by buzz.
Each card shows the flag, the venue, a vibe meter, the faces already going, and a
one‑tap **I'm going** (confetti + your face joins the pile). Belonging = social proof.

### B — My Team Home (`fanwatch-team-home.html`)
Pick your nation once; the **whole app becomes your team's home** — its colors, its
chant, a kickoff countdown, "1,240 of your people within 5 miles," and your crowds
ranked. Belonging = identity. Switch‑team and "I'm neutral" escape hatches included.

### C — Tonight (`fanwatch-tonight.html`)
A matchday **timeline**: fixtures ordered by kickoff (past / **LIVE** / upcoming),
each expanding to the spots near you, with a running **"your plan"** bar as you RSVP.
Belonging = a shared schedule. Answers "what's on and where do I go?"

### Why each wins — and loses

| Dimension | Map | Feed | Team Home | Tonight |
|---|---|---|---|---|
| Belonging / emotion | ◐ | **●** | **●** | ◐ |
| Minimum clicks to "my crowd" | ◐ | ● | **●** | ◐ |
| Spatial reasoning (how far / cluster) | **●** | ○ | ◐ | ◐ |
| Resilient when data is sparse | ○ | **●** | ● | ● |
| Serendipity / discovery | ● | ● | ○ | ◐ |
| Matchday / time fit | ◐ | ◐ | ● | **●** |
| Personalization | ○ | ◐ | **●** | ◐ |
| Best segment | near‑me explorer | locals & neutrals | supporters & diaspora | planners & travelers |

`●` strong · `◐` partial · `○` weak

**The honest read:** no single paradigm wins outright — they trade *space*,
*social proof*, *identity*, and *time* against each other. The map owns "near me";
the Feed owns emotion and sparse‑data resilience; Team Home owns identity and the
diaspora segment; Tonight owns the matchday plan. The strongest product is likely
**Team Home as the personalized shell** (who you are) with the **Feed as the default
body** (what's alive now), **Tonight as the matchday view** (what's the plan), and the
**Map as a toggle** (where exactly) — not four apps, but four lenses on one crowd.

