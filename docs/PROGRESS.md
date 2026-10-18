# PowerSave — Progress

**Current session completed:** Session 6 — Setup, settings, info pages  
**Previous:** Session 5 → Bug fix (wholesale) → Session 4 → Deploy-prep → Session 3–1  
**Next:** You commit + push; then **Session 7** when you say so (`docs/ROADMAP.md`)

---

## Session 6 — Done (Setup, settings, info)

### Contact

`lib/contact.ts` → `CONTACT_EMAIL = northamericanInventory@gmail.com`. Settings report form uses `mailto:` only (no server, no third-party form).

### Delivered

| Route | Status |
|-------|--------|
| `/start` | Three steps (plan + bill helper, chores, preferences), skip, continue as guest → `/app` |
| `/app/settings` | Plan, editable chores, quiet hours, units, theme, account (sign-in link only), delete data, report mailto |
| `/how-it-works` | Method, worked example (Sample data), sources |
| `/plan` | Rates in force + coming Nov 1 2026 section, bill helper, season-aware ribbons |
| `/privacy` | Honest guest copy (localStorage, no accounts, no analytics, IESO, Vercel logs, mailto) |
| `/app/signin` | Still Coming soon (Session 7) |

Landing CTAs “Find my cheapest time” → `/start`. Today: first-visit strip (States §10) + guest tag. Site footer rates line uses the active OEB set.

### Guest persistence (extended)

`localStorage` (try/catch): plan, chores, quiet hours, units, setup-done, first-visit-dismissed. `clearGuestData()` also clears theme key.

### Privacy note

Privacy page was **written by AI** to match what the app does today. **Human review before launch.**

### Tests

| Command | Result |
|---------|--------|
| `npm test` | **50 passed** (incl. contact mailto) |
| `npm run test:py` | **17 passed** |
| `npm run build` | **Success** |

### Deviations from design

| Item | Why |
|------|-----|
| Sign-in remains Coming soon | Session 7 (Supabase) |
| Account section visible but not wired | Spec for Session 6 |
| Privacy is shorter / plainer than design marketing copy | Must match real guest behaviour |

### Open questions

None blocking Session 7. Confirm privacy copy on human review.

### Exact next step (for you)

Commit + push (agent does **not** push). Then start **Session 7** with: `Run Session 7 per docs/ROADMAP.md`.

---

## Session 5 — Done (Core app)

Today / Chore / Tomorrow; season-aware rates; holidays 2026 + 2027 derived; guest plan/chores/quiet; 47 Vitest at end of Session 5 (now 50 with Session 6 contact tests). See git history for full Session 5 notes.

### Rates (keyed by effective date)

| Set | Effective | Verified |
|-----|-----------|----------|
| `lib/rates/2025-11-01.ts` | 2025-11-01 | Yes — OEB current + RPP 2025-10-17 |
| `lib/rates/2026-11-01.ts` | 2026-11-01 | Yes — OEB newsroom 2026-10-16 + RPP PDF |

---

## Bug fix — Vercel `wholesale_core` import — Done

Shared package at project-root `wholesale_core/`; `api/wholesale.py` thin handler.

---

## Session 4 — Done (Polish)

Responsive/a11y/hygiene/rules audit.

---

## Decisions (approved)

1. IESO feed + averages (never “forecast”); verbatim copyright.
2. Stubs until each session replaces them; `/plan` not `/plans`.
3. Geist via `geist` only.
4. Option B local Python + dev rewrite only in development.
5. **Session 5:** Pre–Nov 1 2026 rates = OEB Nov 1 2025 set; Nov 1 2026 rates verified; 2027 holidays derived (option B).
6. **Session 6:** Contact email `northamericanInventory@gmail.com`.
