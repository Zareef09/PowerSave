# PowerSave — Progress

**Current session completed:** Deploy-prep (not Session 4)  
**Previous:** Session 3 (Data API and Grid)  
**Next:** You push to GitHub + Vercel Hobby preview yourself; then Session 4 when you ask

---

## Deploy-prep — Done

### Repo hygiene

- `.gitignore` covers: `node_modules`, `.venv`, `.next`, `__pycache__`, `.env` / `.env.*`, `.vercel`, `.DS_Store`, `.cursor/`, and `PowerSave-Design/**/*.zip`.
- **`powersave-design.zip` is not tracked** (never was in git index). It is now **ignored** so `git add PowerSave-Design/` will not commit the 94K zip. `PowerSave-Design/project/` remains includable. Nothing removed from tracking (nothing to untrack).
- `git status`: everything is still **untracked** (first commit not made). Nothing secret appears in the tree (no `.env` files). Largest ignorable item: the zip. Design `.dc.html` files are intentional.
- Do **not** commit `.venv`, `node_modules`, `.next`.

### Vercel config

- Added [`vercel.json`](../vercel.json): `api/wholesale.py` → **`maxDuration: 300`**.
- **Why 300:** Vercel Hobby Fluid compute max duration is **300 seconds (5 minutes)** — that is both the default and the plan maximum ([Functions limits](https://vercel.com/docs/functions/limitations)). Python uses `vercel.json` `functions` (not a JS `export const maxDuration`).
- `.python-version` = `3.12`; `requirements.txt` = stdlib only (no pytest).
- `/api/wholesale.py` deploys as a serverless function beside Next.js with no extra dashboard config required.

### Timeout safety

- Work budget **`TIME_BUDGET_SECONDS = 8`** (far under 300s maxDuration).
- Always: live latest XML → today’s series → then history for averages until budget spent.
- Response `averages.status`: `complete` | `partial` | `missing` + `daysUsed`; never labels partial as full 3-day/7-day.
- Grid UI: honest note; hides full 3/7 lines unless earned; may show an N-day partial line.
- pytest: Deadline helper, budget + live-price, averages mislabel guard — **13 passed**.

### Preview checklist

- [`docs/DEPLOY.md`](./DEPLOY.md) — GitHub private repo, Vercel Hobby import, post-deploy checks, logs.

### Test results (deploy-prep)

| Command | Result |
|---------|--------|
| `npm test` | 26 passed |
| `npm run test:py` / pytest | 13 passed |
| `npm run build` | Success, no errors |

### Exact next step (for you)

1. Follow [`docs/DEPLOY.md`](./DEPLOY.md): commit (excluding ignored paths), push private GitHub, import Vercel Hobby.
2. Confirm `/api/wholesale`, `/`, `/app/grid` on the preview.
3. Then start **Session 4** in a new chat when ready.

---

## Decisions (approved before Session 2 code)

1. **Data feed — APPROVED.** `RealtimeOntarioZonalPrice` + historical hourly files; aggressive caching; IESO copyright notice reproduced **verbatim** from the Terms of Use page wherever IESO-derived data is shown (do not edit the year). No IESO logos, no affiliation claim. Session 3: freshness from `DeliveryDate` + `DeliveryHour` inside the XML, never from the file name or “latest” alias alone.
2. **“Forecast” lines — APPROVED** as historical same-hour 3-day and 7-day **averages**. Label as averages everywhere; never call them forecasts. Forecast-accuracy panel stays design ghost state + Sample data; no invented accuracy numbers.
3. **Stubs — APPROVED** for `/how-it-works`, `/plan`, `/privacy`. Route is **`/plan`**, not `/plans`. Exact stub URLs: `/start`, `/app`, `/app/tomorrow`, `/app/settings`, `/app/signin`, `/app/chore/[id]`, `/how-it-works`, `/plan`, `/privacy`. Shared `ComingSoon` component + site nav.
4. **Handoff decisions — follow the design file.**
5. **Fonts — APPROVED:** `geist` / `next/font` only (no Google Fonts CDN).

### Session 3 local-dev decision

- **Option B approved:** stdlib local Python runner + **dev-only** Next rewrite.
- pytest in `requirements-dev.txt` + `.venv` (gitignored); **not** in `requirements.txt`.
- `scripts/dev.sh` starts API + `npm run dev` together.
- Handler wrapper tested via pytest against fixtures (Vercel runtime still to be confirmed with a preview deploy before Session 4 ends).

---

## Session 3 — Done

### Python version targeted

**Python 3.12** (Vercel default; also supports 3.13 and 3.14).  
Pinned in [`.python-version`](../.python-version). Code uses only 3.12-compatible stdlib (`zoneinfo`, `from __future__ import annotations`, etc.). Local machine may run 3.14 in `.venv`; syntax stays ≤3.12.

### Delivered

- [`api/wholesale_core.py`](../api/wholesale_core.py) — parse, freshness, version pick, averages, caching, IESO fetch (stdlib)
- [`api/wholesale.py`](../api/wholesale.py) — Vercel `BaseHTTPRequestHandler` + `handle_get()`
- [`scripts/dev_wholesale.py`](../scripts/dev_wholesale.py) — local server on `:8001`
- [`scripts/dev.sh`](../scripts/dev.sh) — one-command local stack
- pytest suite in [`tests_py/`](../tests_py/) with saved XML fixtures (no live network in tests) — **10 passed**, including handler wrapper test
- Full [`/app/grid`](../app/app/grid/page.tsx) wired to API
- Landing Grid teaser uses live latest price; falls back to sample + **Sample data** tag on failure
- Verbatim IESO copyright on Grid and live Landing teaser
- Chart toggle / legend: **Average lines** (not “forecast”)
- Forecast-accuracy panel: design ghost bars + Sample data only

### Freshness

Computed from XML `DeliveryDate` + `DeliveryHour` + last filled `Interval` (hour-ending, America/Toronto).  
- **live** ≤ 5 min age  
- **delayed** > 5 min  
- **stale** > 20 min  

### Caching / IESO politeness

- Live JSON: `Cache-Control: public, s-maxage=90, stale-while-revalidate=60`
- In-process: live ~90s, directory + averages ~1 hour
- User-Agent: `PowerSave/1.0 (+…)`; concurrency capped at **4**
- Version pick: prefer **unversioned** hour file if present, else highest `_vN`

### Worst-case cold-cache IESO requests

**170** = 1 directory listing + 1 latest XML + up to **168** hourly archives (7×24).  
Constant: `WORST_CASE_COLD_REQUESTS` in `wholesale_core.py`. After warm caches, typical refresh is **1** (latest) while averages stay cached.

### Dev rewrite — production guarantee

In [`next.config.ts`](../next.config.ts):

```ts
const enableDevWholesaleRewrite =
  process.env.NODE_ENV === "development" && process.env.POWERSAVE_DEV_REWRITE === "1";
```

- `next build` / Vercel set `NODE_ENV=production` → rewrite **off** even if the flag were set.
- Flag is only set by `scripts/dev.sh`, never on Vercel.
- Verified: `NODE_ENV=production` + `POWERSAVE_DEV_REWRITE=1` still evaluates to **false**.

### Run locally

```bash
cd /Users/zaree/Desktop/PowerSave/PowerSave

# one-time
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# tests
npm test
npm run test:py          # or: .venv/bin/pytest tests_py -v

# app + API together
bash scripts/dev.sh      # or: npm run dev:all
```

Open http://localhost:3000 — Grid at http://localhost:3000/app/grid  
API (direct): http://127.0.0.1:8001/api/wholesale

### Deviations / unmatched vs design

| Item | Why |
|------|-----|
| Chart control label “Average lines” (design: “Forecast lines”) | Session decisions: never call them forecasts. |
| Sample data tag on live Grid price card removed when API ok | Design canvas used sample; live data must not be tagged sample. |
| Theme toggle in app chrome | Needed for light/dark; not drawn in Grid.dc.html. |
| Teaser sparkline y-scale still tuned near design sample range | May clip unusual wholesale spikes; Session 4 polish candidate. |
| Vercel preview not yet deployed | Handler covered by pytest; **you will deploy a preview before Session 4 ends** to confirm the real Python runtime. |

### Open questions

None blocking Session 4. Optional: confirm IESO hour-ending interpretation against a known dispatch timestamp if freshness looks consistently stale/early.

### Exact next step

**Session 4 only:** responsive/a11y pass at 390 & 1440 light+dark; check every non-negotiable rule; deploy to Vercel free tier (include Python preview confirmation); final checklist of design elements done/deviated.

---

## Session 2 — Done

Scaffold, tokens, rates + Vitest, Ribbon, Landing, Coming soon stubs. See git history / prior section details in Session 2 commit notes if needed.

### Run (frontend only)

```bash
npm run dev
```

Without `scripts/dev.sh`, `/api/wholesale` will **not** resolve locally (no rewrite).

---

## Session 1 — Done

Design read + IESO research + PRD. Feed approved in Decisions.
