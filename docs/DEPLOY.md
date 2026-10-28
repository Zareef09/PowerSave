# PowerSave — Deploy checklist (Hobby preview)

For a non-expert. **Do not** put secrets in the repo. No database. No paid add-ons.

This guide gets you a **private GitHub repo** and a **Vercel Hobby preview**. You push and click Deploy yourself — the agent does not touch your accounts.

---

## Before you start

On your machine, from the project root:

```bash
cd /Users/zaree/Desktop/PowerSave/PowerSave
npm test
npm run test:py
npm run build
```

All three should succeed. Local app (optional):

```bash
bash scripts/dev.sh
```

---

## 1. Publish to a private GitHub repo

1. Create a **new private** repository on GitHub (empty is fine — no README required if this folder already has one).
2. In Terminal:

```bash
cd /Users/zaree/Desktop/PowerSave/PowerSave
git status
```

3. Add the files you want (do **not** force-add ignored files). Typical first commit:

```bash
git add .
git status
```

Check that these are **not** listed: `node_modules/`, `.venv/`, `.next/`, `.env*`, `.vercel/`, `PowerSave-Design/powersave-design.zip`.

`PowerSave-Design/project/` (the `.dc.html` design files) **is** fine to include.

4. Commit and push (use your own remote URL):

```bash
git commit -m "Initial PowerSave v1: Landing, Grid, wholesale API"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## 2. Import into Vercel (Hobby)

1. Go to [https://vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. **Add New… → Project**.
3. Import the GitHub repo you just pushed.
4. Framework preset should detect **Next.js**. Leave build settings as defaults:
   - Build Command: `next build` (default)
   - Output: Next defaults
5. **Root Directory**: leave as the repo root (this project already is the app).
6. Environment variables — **optional for guest-only**:
   - Without them, the whole app works as a guest (localStorage). Sign-in shows a clear “not connected” message.
   - For magic-link accounts + sync, add from your **PowerSave** Supabase project (new project only — do not reuse other apps):
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - In Supabase Auth → URL configuration, set Site URL to your Vercel URL and allow redirects:
     - `https://YOUR_DOMAIN/auth/callback`
     - `https://YOUR_DOMAIN/auth/confirm`
   - Apply SQL in `supabase/migrations/20261028200000_user_settings.sql` (SQL editor or CLI).
7. Click **Deploy**.

Python: Vercel picks up `api/wholesale.py` as a serverless function automatically.  
Shared logic lives in the project-root package **`wholesale_core/`** (imported as `from wholesale_core import …`). Do **not** put helper `.py` files directly under `api/` — each becomes its own public endpoint, and siblings are **not** on Vercel’s import path (cwd is the project root).

Config already in the repo:

- `.python-version` → `3.12`
- `requirements.txt` → empty (stdlib only; pytest is **not** installed on Vercel)
- `vercel.json` → `maxDuration: 300` for `api/wholesale.py` (Hobby maximum)
- Local API: from the repo root, `python -m wholesale_core` (or `bash scripts/dev.sh`)

---

## 3. What to check after deploy

Open the **Preview** URL Vercel gives you (or the Production URL if you promoted it).

| Check | URL | Expect |
|-------|-----|--------|
| Landing | `/` | Page loads; plan selector works; Grid teaser shows a price |
| Today | `/app` | Advice cards; first-visit strip or guest/signed-in tag |
| Sign-in | `/app/signin` | Magic link form (needs Supabase env) or honest not-connected message |
| Settings | `/app/settings` | Plan/chores; delete data; report mailto |
| Grid | `/app/grid` | Wholesale banner; live/delayed/stale; chart |
| API | `/api/wholesale` | JSON with `"ok": true` (or honest `"ok": false` + error — never fake live numbers) |

API JSON should include:

- `latest.centsKwh` / `latest.mwH`
- `freshness.state` (`live` \| `delayed` \| `stale`)
- `averages.status` (`complete` \| `partial` \| `missing`) — partial/missing must **not** be labelled as full 3-day/7-day
- `copyright` — IESO Terms of Use text

Cold first request can take several seconds (IESO fetches under an **8s** work budget). Later requests should be faster (CDN `s-maxage=90` + in-process caches).

---

## 4. How to read function logs

1. Vercel dashboard → your **Project**.
2. Open the **Deployments** tab → click the deployment you care about.
3. Open **Logs** / **Runtime Logs** (wording varies slightly).
4. Filter or search for `wholesale` or `/api/wholesale`.
5. Look for:
   - `FUNCTION_INVOCATION_TIMEOUT` — should be rare with maxDuration 300 and an 8s work budget
   - `503` / `"ok": false` — IESO unreachable; UI should show error/stale, not invented prices
   - Successful `200` responses for `/api/wholesale`

Hobby keeps a short window of runtime logs (about **1 hour** on Hobby). Check soon after testing.

---

## 5. Local vs Vercel

| | Local | Vercel |
|--|-------|--------|
| Frontend | `npm run dev` or `bash scripts/dev.sh` | Automatic |
| Python API | `python -m wholesale_core` on `:8001` (dev rewrite) | `api/wholesale.py` → imports `wholesale_core` |
| Dev rewrite | Only when `POWERSAVE_DEV_REWRITE=1` **and** `NODE_ENV=development` | **Off** |

### Past production bug (fixed)

`ModuleNotFoundError: No module named 'wholesale_core'` at import of `api/wholesale.py` meant the shared module lived under `api/` and was only found locally via a `sys.path` insert. Fix: keep `wholesale_core/` at the **project root**; only `api/wholesale.py` is the public function.

---

## 6. If something fails

- **404 on `/api/wholesale`**: confirm `api/wholesale.py` is in the repo root’s `api/` folder and the deployment finished.
- **500 / `No module named 'wholesale_core'`**: confirm the `wholesale_core/` package is in the repo (next to `api/`, not inside it) and was committed. Runtime logs show the import traceback.
- **503 JSON with `ok: false`**: IESO fetch/parse failed; body should include `errorCode` and `stage`. UI should show error/stale, not invented prices.
- **Build fails**: run `npm run build` locally; fix TypeScript/ESLint before pushing again.
- **Empty / wrong averages**: check `averages.status` — partial/missing is intentional under the time budget; a later request may deepen history via cache.
- **Never** paste API keys into the project for this app — v1 does not need them.
