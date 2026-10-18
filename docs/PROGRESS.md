# PowerSave — Progress

**Current session completed:** Bug fix — Vercel `/api/wholesale` import  
**Previous:** Session 4 (Polish) → Deploy-prep → Session 3 → Session 2 → Session 1  
**Next:** You commit + push to `main` so Vercel Hobby redeploys (agent does **not** push)

---

## Bug fix — Vercel `ModuleNotFoundError: wholesale_core` — Done

### Cause

`api/wholesale.py` did `from wholesale_core import …` while `wholesale_core.py` lived **beside** it under `api/`. Locally, `scripts/dev_wholesale.py` inserted `api/` onto `sys.path`, so the sibling imported. On Vercel the working directory / import path is the **project root**, not `api/`, so the sibling was invisible and the function crashed at **import time** (before any IESO call). Putting a shared `.py` directly in `api/` is also wrong: Vercel would expose it as its own public endpoint.

### Fix

- Moved shared logic to project-root package **`wholesale_core/`** (outside `api/`).
- `api/wholesale.py` is a thin Vercel `handler` that imports `handle_get` from that package.
- Local: `python -m wholesale_core` (wired in `scripts/dev.sh`) — same import path as production; no `api/` on `PYTHONPATH`.
- `vercel.json` still targets `api/wholesale.py` (`maxDuration: 300`).
- Structured errors: `errorCode` + `stage` via `build_error_payload` / `handle_get` (fetch/parse/build); history failure still returns live price + today series from `build_payload`.
- pytest: clean-copy import regression + structured error tests (`pytest.ini` `pythonpath = .`).

### Tests

| Command | Result |
|---------|--------|
| `npm test` | **27 passed** |
| `npm run test:py` | **17 passed** |
| `npm run build` | **Success** |

### After you push — check live

1. `GET /api/wholesale` → JSON `"ok": true` with a real `latest` price (not import 500).
2. `/app/grid` → live/delayed data, not “Grid data unavailable”.
3. Vercel runtime logs → no `No module named 'wholesale_core'`.

---

## Session 4 — Done (Polish)

### Tests (must all pass)

| Command | Result |
|---------|--------|
| `npm test` | **27 passed** |
| `npm run test:py` | **13 passed** |
| `npm run build` | **Success** |

### Responsive fixes (390 / 1440, light + dark)

| Fix | Where |
|-----|--------|
| Nav: tighter gaps, smaller “Open app” padding on narrow, live tag only `lg+`, tap targets ≥44px | `SiteNav.tsx` |
| Theme toggle: `min-w-11`, `aria-pressed` | `ThemeToggle.tsx` |
| Landing hero: `px-4` at narrow, h1 40→48→88, full-width plan select + CTA on mobile | `LandingPage.tsx` |
| Demo panel / ribbons: `overflow-hidden`, tighter padding at 390 | `LandingPage.tsx` |
| Scroll-moment figures: 56/72/112 scale; line titles 40/48/88 | `LandingPage.tsx` |
| Teaser price: 44→56px so it doesn’t clip | `LandingPage.tsx` |
| Final CTA headline: break-words + mobile scale | `LandingPage.tsx` |
| Grid: banner / h1 / price (56→72→96) / card padding scale | `GridPage.tsx` |
| Chart card: overflow + padding; scrub already keyboard | `PriceLineChart.tsx` |
| App chrome mobile header: tighter padding | `AppChrome.tsx` |
| Coming soon / 404: mobile type + padding; ink CTA (not lime) | `ComingSoon.tsx`, `not-found.tsx` |

### Accessibility fixes

| Fix | Where |
|-----|--------|
| Global `:focus-visible` ring (accent blue) | `globals.css` |
| Skip link → `#main-content` | `layout.tsx` + Landing / Grid / stubs / 404 |
| Plan `<select>` labelled; theme `aria-pressed` + label | Landing, `ThemeToggle` |
| Chart: `aria-live` tip, range `aria-valuetext`, toggle `aria-pressed` | `PriceLineChart`, `GridPage` |
| Ribbon `role="img"` + spoken period summary (existing) | `Ribbon.tsx` |
| `prefers-reduced-motion`: no save ticker, no scroll-moment prog animation, no Ribbon reveal, CSS kills keyframes | `LandingPage.tsx`, `globals.css` |

### Public hygiene

- Page titles/descriptions: root template + `/`, `/app/grid`, every stub
- Favicon: `public/favicon.svg`
- 404: `app/not-found.tsx` with site nav + footer
- `public/robots.txt` — `Allow: /`
- No analytics, cookies, tracking, or new dependencies

### Non-negotiable rules audit

| # | Rule | Result | File:line |
|---|------|--------|-----------|
| 1 | Advice from rate plan only | **PASS** | `lib/pricing.ts:95` (`adviceForChore`); Landing wires plan → cards at `LandingPage.tsx:189` — never wholesale |
| 2 | Wholesale label wherever wholesale price shows | **PASS** | `GridPage.tsx:111`, `:173`; `PriceLineChart.tsx:85`, `:102`; `LandingPage.tsx:524` |
| 3 | Savings = electricity-cost estimates | **PASS** | `LandingPage.tsx:333` (“Estimates cover electricity cost only…”) |
| 4 | “Any time. Same price all day.” for TOU weekends/holidays + Tiered | **PASS** (weekends + Tiered); **deviation** holidays | String `lib/pricing.ts:78`; branch `:112–117`. Weekends use `day === "weekend"`. **No Ontario statutory-holiday calendar in v1** — holidays are not auto-detected |
| 5 | No login wall | **PASS** | Guest Landing + Grid; `/app/signin` is Coming soon stub `app/app/signin/page.tsx:10` |
| 6 | No fake proof / real-org logos | **PASS** | Proof strip is text-only (`LandingPage` PROOF); footer disclaims affiliation `SiteFooter.tsx:27–28`; no logo assets |
| 7 | Sample data tag on sample numbers only | **PASS** | Sample: Landing demo/cards/moment `LandingPage.tsx:264`, `:299`, `:383`; teaser sample `:521`; Grid error/ghost `GridPage.tsx:170`, `:251`. Live teaser/Grid price: tag omitted when `ok` |
| 8 | Colour never the only signal | **PASS** | Ribbon hatch + labels `Ribbon.tsx:43`, `:184–198`; chart legend text `PriceLineChart.tsx:205+` |
| 9 | Lime only on saving + primary CTA (window = lime+ink outline OK) | **PASS** | Saving pills `LandingPage.tsx:306`, `:404`; primary CTAs `:246`, `:591`; window outline `Ribbon.tsx:236–238`. Coming soon CTA switched to ink (was lime) |
| 10 | Muted strong on panels | **PASS** | Panel labels use `text-muted-strong` / `--m2` (e.g. demo stamp, plans panel, Grid mono labels) |
| — | IESO copyright verbatim, no logos | **PASS** | `lib/ieso.ts:2–3`; render `IesoCopyright.tsx:6`; Grid `GridPage.tsx:276`; live Landing teaser `LandingPage.tsx:557` |

### Design checklist — Landing (`Landing.dc.html`)

| Element | Status |
|---------|--------|
| Site nav (logo, links desk, Open app) | **Done** — plus ThemeToggle (needed; not in Landing canvas) |
| Live Ontario grid mono tag | **Done** — shown from `lg` up so 390 nav doesn’t overflow |
| Hero /00 stamp, h1, lead | **Done** |
| Plan selector + lime “Find my cheapest time” | **Done** |
| Dot-panel demo + hero Ribbon + 3 chore cards + sample tags | **Done** |
| Electricity-cost disclaimer | **Done** |
| Proof strip (4 text cells) | **Done** |
| Scroll moment (lines + sticky laundry card + ticker) | **Done** — ticker/prog skip under reduced motion |
| How it works 3 steps | **Done** |
| Plans panel + 3 plan mini ribbons | **Done** |
| Grid teaser + wholesale label + sparkline | **Done** — live when API ok; sample tagged on failure |
| Method card | **Done** |
| Final lime CTA | **Done** |
| Footer | **Done** |

### Design checklist — Grid (`Grid.dc.html`)

| Element | Status |
|---------|--------|
| App chrome (side nav desk / bottom nav mobile) | **Done** — ThemeToggle added (needed) |
| Wholesale banner always visible | **Done** |
| Title + source mono stamps | **Done** |
| Delayed/stale/error banner | **Done** |
| Live price card + updates/countdown | **Done** |
| Chart + scrub + average-line toggle | **Done** |
| Toggle label “Average lines” not “Forecast lines” | **Deviated** — Session 3 decision: never call averages forecasts |
| Explainer + forecast-accuracy ghost + Sample data | **Done** |
| IESO copyright footer | **Done** |
| Sample tag on live price when API ok | **Deviated** — must not tag live numbers as sample |

### Other deviations (unchanged / noted)

| Item | Why |
|------|-----|
| No holiday calendar for TOU “holidays” | v1 only knows weekday vs weekend day-kind; holidays need a calendar to auto-flip |
| Teaser sparkline y-scale near design sample range | May clip unusual wholesale spikes |
| Theme toggle on Landing/Grid chrome | Required for light/dark; not drawn in every canvas |

### Exact next step (for you — do not skip)

See commit/push instructions in the Session 4 handoff message (agent did **not** push).

---

## Deploy-prep — Done

See prior section details in git history. Site is on Vercel Hobby project **powersave**; push to `main` redeploys.

---

## Decisions (approved)

1. Data feed `RealtimeOntarioZonalPrice` + averages (never “forecast”); IESO copyright verbatim.
2. Stubs for out-of-scope routes; `/plan` not `/plans`.
3. Geist via `geist` package only.
4. Option B local Python + dev rewrite only when `NODE_ENV=development` && `POWERSAVE_DEV_REWRITE=1`.

---

## Session 3 / 2 / 1 — Done

API + Grid + Landing scaffold + PRD. See earlier commits / prior PROGRESS sections in history if needed.
