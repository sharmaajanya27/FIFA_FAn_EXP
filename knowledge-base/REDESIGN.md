# Frontend Redesign — "The Fan Festival"

The fan-facing web app (`../frontend`) was restyled from the original card/map
dashboard into an **editorial broadsheet** theme called *The Fan Festival*. This
note is the developer-facing record of **what changed, what was replaced, and
why** — read it before touching `frontend/src/app/globals.css`, the home page,
or the SEO/admin styling.

> Scope: presentation + information architecture only. **No API, data model, or
> backend behavior changed.** Every value rendered still comes from the existing
> discovery/engagement endpoints. No invented crews, taglines, or attendance.

> **Update (refinement pass):** the app was later rebranded **FanWatch → Tu
> Parea** and the festival system polished — muted bunting, a live-score marquee
> ticker, a home "Fan events" section, a redesigned footer, and mobile
> breakpoints (§9). A **second polish pass (§10)** then renamed the header gloss
> to *The Fan Festival*, reordered the ticker above the bunting, brightened and
> lengthened the triangles, restyled the buttons, and stripped the footer back.
> **§10 below is the current record;** where sections differ, the higher number
> wins.

---

## 1. What it looks like now

A warm **paper/newsprint** canvas (`--paper #f7eeda`) with a faint halftone dot
texture, a sticky **masthead** ("Tu Parea", tagline *Your team · Your people ·
Your sport*), triangular **bunting**, a **muted** five-hue **festival palette**,
a **live-score marquee ticker**, and three display typefaces. Content is
organized like a festival programme:

- **Hero ("crew") band** — headline, lede with a drop-cap stat, two CTAs, the
  World-Cup season banner, and a **Headliner** card (the #1 nearby venue).
- **Tonight's Lineup** — every nearby watch party as a ranked `<ol>`, sortable
  by crowd or distance, each row linking to the venue detail page.
- **Map / List toggle** — the Leaflet map is unchanged; "List" now renders the
  Lineup.

---

## 2. Information architecture change

The single scrolling discover/live/community dashboard became a **three-tab
programme** driven by the masthead nav:

| Tab           | Content                                                        |
| ------------- | ------------------------------------------------------------- |
| **Crews**     | Hero + Headliner + city picker + Map/Lineup (the old discover)|
| **Fixtures**  | Live scores (`LiveEventsPanel`) + fan events (`EventsPanel`)  |
| **My Team**   | `CommunityPanel` — gated behind `FEATURES.community`          |

The "Following [team]" selector in the masthead is the national-team filter; it
drives venue, event, and match queries exactly as the old team filter did.

---

## 3. Typography

Fonts are loaded with `next/font/google` in
[`../frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx) (self-hosted,
no render-blocking CDN request, no CLS) and exposed as CSS variables:

| Variable          | Family       | Role                          |
| ----------------- | ------------ | ----------------------------- |
| `--font-display`  | **Anton**    | Headlines, ranks, brand marks |
| `--font-body`     | **Archivo**  | UI / body text                |
| `--font-serif`    | **Newsreader** (italic) | Ledes, meta accents |

**Replaced:** the previous single display face (Fraunces) and its `<link>` to
Google Fonts were removed.

---

## 4. The design-token layer

All theming lives in `:root` in
[`../frontend/src/app/globals.css`](../frontend/src/app/globals.css). The SEO and
admin CSS modules consume these tokens (`var(--text)`, `var(--accent)`,
`var(--border)`, `var(--radius)`, …), so a token change propagates everywhere.
**Legacy token *names* were kept stable** (e.g. `--accent-2/-3/-4`, `--danger`,
`--gold-grad`, `--host-grad`) so the modules didn't need rewiring.

Key tokens:

- **Surfaces:** `--paper`, `--panel`, `--panel-2`, `--border`, `--border-strong`
- **Text:** `--ink`/`--text`, `--muted`, `--faint` (decorative only)
- **Lead accent:** `--accent` (coral `#ff5436`, fills/large display),
  `--accent-deep` (`#e23a2e`, hover + AA-large text), `--accent-text`
  (`#b8301c`, **AA for small text on paper**)
- **Festival palette (decorative):** `--c1…--c5` (muted hues for bunting flags)
- **Festival palette (text):** `--c1-text…--c5-text` — deeper, **AA-safe**
  variants used wherever a palette hue is rendered as *readable text*
- **Other:** `--gold`, `--purple`/`--on-purple`, `--radius: 5px`

---

## 5. New / changed files

### Added

| File | Purpose |
| ---- | ------- |
| `frontend/src/lib/festival.ts` | Pure presentation helpers derived from real `RankedVenue` data: `paletteAt`/`paletteTextAt` (rank/tag colors), `kindLabel`, `affiliationLine`, `capacityOf` (Packed / Filling fast / Room to move), and the `PALETTE` / `PALETTE_TEXT` tuples. |
| `frontend/src/components/festival/Masthead.tsx` | Sticky masthead: brand, festival nav (Crews/Fixtures/My Team), "Following" team selector, bunting. |
| `frontend/src/components/festival/Lineup.tsx` | "Tonight's Lineup" ranked list with crowd/distance sort. Rows link to venue detail. |
| `frontend/src/components/festival/LiveScoreTicker.tsx` | *(refinement pass)* Accessible auto-scrolling marquee of live World-Cup scores under the masthead — see §9. |

### Rewritten

- `frontend/src/app/page.tsx` — restructured to the three-tab IA above; now
  composes `Masthead` + hero + `Headliner` + Map/`Lineup` + `Fixtures` +
  `My Team`. Fetches venues, events, and matches in one `Promise.all`.
- `frontend/src/app/globals.css` — full festival design system (tokens, masthead,
  bunting, hero, headliner, lineup, buttons) plus restyled legacy classes
  (`.controls`, `.panel`, `.list`, `.venue`, `.badge`, `.metrics`, footer, …).

### Restyled (CSS/markup only, behavior unchanged)

- `frontend/src/components/seo/seo.module.css` + `SeoShell.tsx` — Anton headings,
  JS-free triangular bunting, brand + "The Fan Festival" wordmark, skip link.
- `frontend/src/app/admin/admin.module.css` — Anton title/KPIs, festival radii
  and accent button.
- `frontend/src/components/event/eventEngagement.module.css` — accent-text and
  error colors brought to AA on the paper background.

### Removed (dead code, orphaned by this redesign)

| File | Why |
| ---- | --- |
| `frontend/src/lib/cityThemes.ts` | Per-city accent/skyline theming (`cityTheme`, `scatterBalls`). The festival theme is global; nothing imports it anymore. |
| `frontend/src/components/VenueList.tsx` | Replaced by `festival/Lineup.tsx`. No remaining importers. |

> **Not removed (flagged for a future cleanup):** the per-city skyline assets in
> `frontend/public/cities/*.svg` were only referenced by the retired
> `.city-skyline` styling. They are now unused but left in place as static
> assets. Safe to delete if no other surface picks them up.

---

## 6. Accessibility (WCAG 2.1 AA)

Accessibility was treated as a release gate. What's in place:

- **Landmarks:** `<header>` + `<nav aria-label="Primary">`, `<main id="main">`,
  labeled `<section>`/`<aside>`, `<footer>` on every page.
- **One `<h1>` per page**, correct heading nesting below it.
- **Skip link** (`#main`) on the home page and every SEO page.
- **Decorative elements** (bunting, halftone, hero rule, headliner pitch, season
  pulse, flag emoji) are `aria-hidden`.
- **Keyboard:** all controls are real `<button>`/`<select>`/`<Link>`; sort and
  view toggles expose `aria-pressed`; the city `<select>` has an `sr-only`
  label; `:focus-visible` rings are defined globally (gold on dark surfaces).
- **Motion:** `@media (prefers-reduced-motion: reduce)` disables animations and
  transitions.
- **Live regions:** loading uses `aria-live="polite"`; errors use `role="alert"`.
- **Contrast:** every text/UI color pair was verified ≥ 4.5:1 (small text) or
  ≥ 3:1 (large text / graphical). The two-tier palette exists for this reason —
  vivid `--c*` hues are decorative-only; readable colored text uses the AA-safe
  `--c*-text` / `--accent-text` tokens. Primary buttons use **dark ink on coral**
  (5.3:1) rather than white-on-coral (which failed).

---

## 7. SEO

- Self-hosted fonts (no third-party render-block).
- All metadata, canonical URLs, OpenGraph/Twitter tags, dynamic OG images,
  JSON-LD (WebSite, LocalBusiness, ItemList, FAQ, Breadcrumb), `sitemap.ts`, and
  `robots.ts` on the SEO and detail routes were **preserved unchanged**.
- Indexation gates (thin city / city×team / venue pages get `noindex` and drop
  from the sitemap) are unchanged.
- Semantic markup throughout (ranked lists are real `<ol>`, breadcrumbs are
  `<nav aria-label="Breadcrumb">`).

---

## 8. Verification

- `api`, `frontend`, and `ingestion` all pass `npm run typecheck`.
- `frontend` passes `npm run build` (26 static pages generated; SSG routes for
  `/watch/[city]`, `/watch/[city]/[team]`, `/venue/[city]/[id]` intact).
- Contrast ratios verified for every rendered color pair.

---

## 9. Refinement pass — Tu Parea (rebrand + festival polish)

A second pass rebranded the app and tightened the festival system.
**Presentation only; no API, data model, or backend behavior changed.** This
section supersedes the brand/palette details in §1–§5 above.

### Brand

- The wordmark is now **"Tu Parea"** (two-tone: ink "Tu" + `--accent-deep`
  "Parea") with the tagline **"Your team · Your people · Your sport"** in serif
  italic. "Tu" (Spanish, *your*) + "Parea" (Greek, *crew/close friends*) reads
  across languages, and the tagline glosses the meaning so no visitor is left
  guessing.
- Rebrand is end-to-end: `festival/Masthead.tsx`, `seo/SeoShell.tsx`, the footer,
  and **all SEO metadata** — `lib/seo.ts` (`siteName`, WebSite JSON-LD),
  `layout.tsx` title, and every page `<title>`/OG (`/watch`, `/watch/[city]`,
  `/watch/[city]/[team]`, `/venue/[city]/[id]`, `/event/[id]`, the OG-image
  routes, `/admin`, `/business`). Canonical URLs, structured data, `sitemap.ts`,
  and `robots.ts` are otherwise unchanged.
- Internal storage keys (`fanwatch_anon_id`, `fanwatch_fav_team`, analytics
  `fanwatch_sid`) were **left as-is on purpose** — renaming them would reset
  every existing visitor's anonymous id and favourite team.

### Live-score ticker (new)

`frontend/src/components/festival/LiveScoreTicker.tsx` renders World-Cup scores
as an auto-scrolling **marquee** under the masthead. It polls `api.liveEvents()`
every 30 s, sorts in-progress → upcoming → final, and returns `null` when empty.
Accessibility follows **WCAG 2.2.2 (Pause, Stop, Hide)**:

- an explicit **Pause/Play** toggle (`aria-pressed`);
- pauses on hover and keyboard focus;
- `@media (prefers-reduced-motion: reduce)` stops the animation and switches the
  track to a non-animated, horizontally scrollable strip (the duplicated marquee
  copy used for the seamless loop is `aria-hidden`);
- no `aria-live` — the scroll is decorative; the Fixtures panel is the source of
  truth.

### Home "Fan events" section (new)

The home (Crews) view now surfaces upcoming watch parties by default: a
`.home-events` section under the Lineup renders `EventsPanel` with its own `<h2>`
(`id="home-events-title"`, distinct from the Lineup heading so there is still
exactly one `<h1>`). It reuses the `events` array already fetched for the
Fixtures tab — no new request.

### Live-scores panel restyle (Fixtures)

`LiveEventsPanel.tsx` header was rebuilt as `.scores-head`: title "World Cup 2026
scores" + live-count pill, a **light serif-italic** subtitle ("Live & upcoming ·
updated …", seconds dropped), and a **ghost pill** Refresh button (`↻`). The
redundant outer `<div class="panel"><h2>Live scores</h2>` wrapper in `page.tsx`
was removed so the panel is no longer double-boxed.

### Footer redesign

The footer is now a Tu Parea sign-off: a JS-free CSS **pennant strip**
(`.footer-bunting`, `repeating-linear-gradient` + `mask`, `aria-hidden`), the
two-tone wordmark, the serif-italic tagline, a host-nation line ("Canada · Mexico
· United States · World Cup 2026"), copyright, and the existing not-affiliated
FIFA note.

### Muted festival palette

The bunting hues (`--c1…--c5`) were toned down to muted, harmonised tones
(terracotta / teal / dusky violet / rose / ochre) that read as *printed cloth* on
the warm paper rather than neon. These tokens feed **only** the two decorative
buntings (masthead + footer) and the JS-free SEO bunting; accents and gradients
use their own hex, and the AA-safe `--c*-text` text tokens are unchanged, so
ranking/label colors are unaffected.

### Responsive polish

Added `@media (max-width: 680px)` and `@media (max-width: 420px)` blocks so the
masthead wraps (brand + tagline stack; the tagline drops its divider), the hero
title scales with `clamp()`, and the scores-head / ticker / footer reflow to
match the shared mobile template.

### Verification

- `frontend` passes `npm run typecheck`.
- Verified in-browser at desktop (~1160 px) and mobile (~343 px): rebrand, muted
  bunting, marquee ticker (live `66'` clock + Pause), home Fan events, the
  restyled Fixtures scores panel, and the new footer all render with live API
  data (50 Jersey City venues, 6 fan events, live scores).

---

## 10. Polish pass — "The Fan Festival" gloss + festival cleanup

A third presentation pass acted on direct review feedback.
**Presentation only; no API, data model, or backend behavior changed.** Where it
differs from §9, this section wins.

### Header gloss → "The Fan Festival"

The serif-italic masthead gloss no longer reads "Your team · Your people · Your
sport". Both `festival/Masthead.tsx` (`.mast-fest`) and `seo/SeoShell.tsx`
(`.fest`) now render **"The Fan Festival"** — a single label that names the
theme instead of restating the wordmark. The two-tone **"Tu Parea"** wordmark is
unchanged. (The SEO footer copyright line still contains the old
"your team, your people, your sport" phrasing — left as-is this pass.)

### Ticker above the bunting (seam fix)

On the home page the decorative bunting was the last child of the sticky **cream**
masthead, immediately followed by the **dark** live-score ticker — a jarring
cream→triangles→dark→cream seam. The bunting was **moved out of `Masthead.tsx`
into `page.tsx`, rendered right after `<LiveScoreTicker />`**, so the order is now
masthead → **dark ticker → triangles → cream hero**. The triangles hang from the
dark scores bar into the warm paper, no white/beige boundary. The bunting is 28
`.flag` spans coloured with `paletteAt(i)`; `paletteAt` is no longer imported by
`Masthead.tsx`.

### Brighter, longer triangles

- **Supersedes §9's muted palette.** `--c1…--c5` were brightened to vivid
  festival hues so the triangles pop against the paper:
  `--c1 #f2542f`, `--c2 #14a08f`, `--c3 #7d5be6`, `--c4 #ee5b97`, `--c5 #f5a623`.
  They still feed **only** the decorative buntings; the AA-safe `--c*-text`
  tokens are untouched, so ranking/label colours are unaffected.
- `.bunting .flag` height `22px → 30px` (longer pennants).
- The SEO bunting (`seo.module.css`) was converted from a CSS **mask zigzag**
  (which rendered "jumbled" on venue/RSVP pages) to the same clean **clip-path
  triangle** spans as the app bunting (`.flag { width:26px; height:30px;
  clip-path: polygon(0 0,100% 0,50% 100%) }`), rendered by `SeoShell.tsx`.

### Button states

Primary/coral buttons no longer carry a permanent black outline. `.btn-primary`,
`button.primary` (globals) and `.cta` (SEO) now use a **transparent** 2–2.5px
border by default (coral fill, ink text — layout stable), and on
**`:hover, :focus-visible`** switch to `background: --accent-deep`, a solid
`--ink` border, and **white** text — a clear "focused" affordance. (The white-on-
coral hover state is transient and paired with the strong ink border; the resting
ink-on-coral state carries the AA contrast.)

### Footer stripped back

**Supersedes §9's footer redesign.** The footer is now just the two-tone
wordmark, **"World Cup 2026"**, copyright, and the FIFA not-affiliated note. The
serif tagline and the "Canada · Mexico · United States" host-nation line were
removed, and the decorative footer bunting was **deleted entirely** (both the
`.footer-bunting` JSX and its CSS rule) — the pennants live only under the
scores ticker up top now.

### Verification

- `frontend` passes `npm run typecheck`.
- Verified in-browser (1200×900): home shows "The Fan Festival" gloss, dark
  ticker above brighter/longer triangles into the cream hero, and the trimmed
  footer with no bunting. Button hover confirmed via forced `:hover` state —
  computed `color rgb(255,255,255)`, `border-color rgb(36,27,18)`,
  `background rgb(226,58,46)`. The SEO `/watch/[city]` and `/venue/[city]/[id]`
  (RSVP) pages show the same gloss and clean bright bunting (32 flags).
