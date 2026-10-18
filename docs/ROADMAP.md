# PowerSave — Remaining build roadmap

Sessions after Landing, Grid, polish, and the wholesale import fix. Start each with: **“Run Session N per docs/ROADMAP.md”**.

Non-negotiable PRD rules apply to every session. Do not edit `PowerSave-Design`. Do not push unless asked.

---

## Session 5 — Core app (Today, Chore, Tomorrow)

**Status:** done  


**Routes:** `/app` (Today), `/app/chore/[id]`, `/app/tomorrow` — replace Coming soon stubs.

**Includes:** every design scenario (weekday TOU, ULO, weekend, Tiered, loading, empty, error, offline, unmet deadline, crossing midnight, DST day). Pricing engine extended with done-by deadlines, quiet hours, and search windows (from design + Checks). Guest `localStorage` for plan, chores, and quiet hours (try/catch; works without it). Ontario TOU holiday calendar; rates keyed by effective date (never present future rates as current). Landing/nav/sidebar/tabs point at the real pages.

**Out of this session:** `/start`, `/app/settings`, `/how-it-works`, `/plan`, `/privacy`, `/app/signin`, accounts.

---

## Session 6 — Setup, settings, info pages

**Status:** not started  

**Routes:** `/start` (three steps, bill helper, skip), `/app/settings` (plan, editable chores, quiet hours, units, theme, report form; account section visible but sign-in not wired), `/how-it-works`, `/plan`, `/privacy`, remaining shared states. Remove every remaining Coming soon stub.

**Out of this session:** Supabase accounts, real sign-in, final polish pass.

---

## Session 7 — Accounts + final polish

**Status:** not started  

**Includes:** `/app/signin` and optional accounts with Supabase (**new project only**), settings sync and account deletion, privacy page matching what the app actually does, then final polish: responsive, accessibility, non-negotiable rules audit, full design checklist, deploy checks.
