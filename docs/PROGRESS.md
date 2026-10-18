# PowerSave — Progress

**Current session completed:** Session 5 — Core app (Today, Chore, Tomorrow)  
**Previous:** Bug fix (wholesale import) → Session 4 → Deploy-prep → Session 3–1  
**Next:** You commit + push; then **Session 6** when you say so (`docs/ROADMAP.md`)

---

## Session 5 — Done (Core app)

### Delivered

| Route | Status |
|-------|--------|
| `/app` (Today) | Real page — plan, chore cards, done-by, loading/empty/offline, America/Toronto clock |
| `/app/chore/[id]` | Real page — verdict, ribbon, scrubber, kWh/duration/deadline, quiet hours |
| `/app/tomorrow` | Real page — tomorrow windows, copy plan, any-time for Tiered/TOU weekend·holiday |

Landing CTAs “Find my cheapest time” → `/app`. App chrome Today / Tomorrow / Grid / Settings tabs already pointed at these routes.

### Rates (keyed by effective date)

| Set | Effective | TOU | ULO | Tiered | Verified |
|-----|-----------|-----|-----|--------|----------|
| `lib/rates/2025-11-01.ts` | 2025-11-01 | 9.8 / 15.7 / 20.3 | 3.9 / 9.8 / 15.7 / 39.1 | 12.0 / 14.2 | Yes — OEB current prices + RPP report 2025-10-17 |
| `lib/rates/2026-11-01.ts` | 2026-11-01 | 9.1 / 14.6 / 18.9 | 3.7 / 9.1 / 14.6 / 37.7 | 11.2 / 13.2 | Yes — OEB newsroom 2026-10-16 + [rpp-price-report-20261016.pdf](https://www.oeb.ca/sites/default/files/rpp-price-report-20261016.pdf) |

- **Season-aware TOU hours:** summer May 1–Oct 31; winter Nov 1–Apr 30.
- **ULO hours:** year-round (do **not** change by season) — OEB electricity rates page.
- UI shows `Rates as of …` for the **active** set only (never future rates as current).
- Nov 1 2026 = DST end (first Sunday) **and** rate/season switch — covered in tests.

### Holidays

- **2026:** official OEB [holiday schedule](https://oeb.ca/consumer-information-and-protection/electricity-rates/holiday-schedule-time-use-and-ultra-low).
- **2027:** derived (same names + weekend → next non-holiday weekday); marked in `lib/rates/holidays.ts`.
- **After 2027:** weekday/weekend only until the table is updated.

**Maintenance:** When the OEB publishes the next year’s TOU/ULO holiday schedule, update `lib/rates/holidays.ts` and extend tests. No user-facing warning.

### Pricing engine

- Done-by deadlines (incl. dishwasher @ 7:30 PM copy; laundry by 6 PM can’t finish).
- Quiet hours 10 PM–7 AM (Chore detail + respected in search when on).
- Midnight crossing via UTC minute steps + Toronto wall clock.
- 25 golden Checks still pass; extra Session 5 tests for deadlines, quiet hours, holidays, seasons, DST.

### Guest persistence

`localStorage` (try/catch): plan, chores (kWh, duration, deadline, enabled), quiet hours. Works without storage.

### Tests

| Command | Result |
|---------|--------|
| `npm test` | **47 passed** |
| `npm run test:py` | **17 passed** |
| `npm run build` | **Success** |

### Deviations from design

| Item | Why |
|------|-----|
| Today has no Sample data tags on live advice | Live Toronto clock + user chores — not the design’s demo stamp |
| Quiet hours on Chore (and search), not on Today cards’ own toggle | Design puts the toggle on Chore/Settings; Today respects stored quiet flag |
| Tomorrow “when” copy is computed, not the design’s hard-coded Nov 19 strings | Real calendar day after “now” |
| First-visit setup strip (States §10) | Deferred to Session 6 `/start` |
| Settings / Start / How it works / Plan / Privacy / Sign-in | Still Coming soon (Session 6–7) |

### Open questions

None blocking Session 6. Optional: wire Today “Add a chore” empty state to Session 6 settings chore editor (link already goes to `/app/settings` stub).

### Exact next step (for you)

Commit + push (agent does **not** push). Then start **Session 6** with: `Run Session 6 per docs/ROADMAP.md`.

---

## Bug fix — Vercel `wholesale_core` import — Done

Shared package at project-root `wholesale_core/`; `api/wholesale.py` thin handler. See prior section / git history.

---

## Session 4 — Done (Polish)

Responsive/a11y/hygiene/rules audit. See prior notes.

---

## Decisions (approved)

1. IESO feed + averages (never “forecast”); verbatim copyright.
2. Stubs until each session replaces them; `/plan` not `/plans`.
3. Geist via `geist` only.
4. Option B local Python + dev rewrite only in development.
5. **Session 5:** Pre–Nov 1 2026 rates = OEB Nov 1 2025 set; Nov 1 2026 rates verified from OEB RPP report; 2027 holidays derived (option B).
