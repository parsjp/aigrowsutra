# AIGrowSutra — AI Training, Agent Building & Website Building Platform

A complete, production-ready **full-stack website** for an AI education business —
frontend, backend, and database included. The prompt library is powered by the
open-source **[prompts.chat](https://prompts.chat)** dataset
([github.com/f/prompts.chat](https://github.com/f/prompts.chat)).

## What's inside

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | No build step — `public/` served directly. Dark theme, responsive, accessible. |
| Backend | Node.js + Express | JSON API + static hosting in one process (`server.js`). |
| Database | SQLite (built-in `node:sqlite`) **or** PostgreSQL | SQLite by default, zero config. Set `DATABASE_URL` for free cloud Postgres (Neon/Supabase). |
| Prompt data | prompts.chat dataset | 2,900+ prompts, auto-categorised, searchable via API. |

### Pages

- `/` — marketing home: hero, program cards, features, prompt teaser, testimonials, newsletter
- `/courses` — full syllabi for the 4 programs, pricing tiers, FAQ
- `/prompts` — live searchable prompt library (search, category + type filters, copy button)
- `/contact` — enrollment form (program prefill via `?program=`) saved to the database
- `/404` — friendly not-found page

### API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service + DB status |
| GET | `/api/stats` | Prompt / lead / subscriber counts |
| GET | `/api/programs` | The four flagship programs |
| GET | `/api/prompts?q=&category=&type=&page=&limit=` | Search the prompt library |
| GET | `/api/prompts/facets` | Categories and types with counts |
| POST | `/api/leads` | Save an enrollment/contact submission |
| POST | `/api/newsletter` | Save a newsletter signup (dedupes email) |

---

## Run locally

Requires **Node.js 23.4+** (Node 24 recommended — SQLite is built in, no native
compilation, no other services needed).

```bash
npm install
npm start          # → http://localhost:3000
```

That's it — the SQLite database (`data/aigrowsutra.db`) is created and seeded
from `data/prompts.csv` automatically on first boot.

### Useful scripts

```bash
npm run dev        # auto-restart on file changes
npm run seed       # seed the prompt library (no-op if already seeded)
npm run seed -- --force   # wipe + re-import prompts
npm run refresh    # re-download the latest prompts.chat dataset, then re-import
```

> **Windows note:** if `npm` is blocked by PowerShell's execution policy, run
> `npm.cmd install` / `npm.cmd start` instead, or run from CMD.

---

## Deploy for free (hosting + domain + database)

### 1. Put the code on GitHub

```bash
cd aigrowsutra
git init && git add -A && git commit -m "AIGrowSutra initial release"
git branch -M main
git remote add origin https://github.com/<you>/aigrowsutra.git
git push -u origin main
```

### 2. Host it free on Render

1. Create a free account at **[render.com](https://render.com)**.
2. **New + → Blueprint**, pick your repo — the included `render.yaml` configures
   everything (Node, free plan, `npm install` / `npm start`).
   *(Or manually: New + → Web Service → same repo → runtime Node → build
   `npm install` → start `npm start`.)*
3. Your site goes live at **`https://aigrowsutra.onrender.com`** — a free domain,
   HTTPS included.

> Free Render services sleep after ~15 minutes of inactivity and cold-start in
> ~30–60s on the next request. That's normal for free tiers.

### 3. Add a free persistent database (Neon Postgres)

Render's free filesystem is **ephemeral** — a SQLite file there is wiped on each
redeploy. For persistent data, use free cloud Postgres:

1. Create a free project at **[neon.tech](https://neon.tech)** (or
   [supabase.com](https://supabase.com) — both have generous free tiers).
2. Copy the **pooled connection string** (`postgres://…?sslmode=require`).
3. In Render → your service → **Environment** → add:
   `DATABASE_URL = <your connection string>`
4. Redeploy. The app detects `DATABASE_URL`, switches to Postgres, creates the
   tables and **auto-seeds all 2,900+ prompts** on first boot.

Locally you can do the same by setting the variable before starting:
`DATABASE_URL=postgres://… node server.js` (or use `.env`-style tooling).

### 4. Free domain options

- **`aigrowsutra.onrender.com`** — free subdomain from Render (already yours).
- **`aigrowsutra.is-a.dev`** — a genuinely free, forever subdomain from
  [is-a.dev](https://www.is-a.dev) (open a small GitHub PR pointing a CNAME at
  your Render URL).
- **Students:** the [GitHub Student Developer Pack](https://education.github.com/pack)
  includes a free `.me` domain for a year.
- Later, a custom `.com`/`.in`/`.xyz` (~₹99–999/yr) can be added in Render →
  Settings → Custom Domains (Render issues free HTTPS certificates).

---

## Project structure

```
aigrowsutra/
├── server.js               # Express app: API + static frontend
├── src/
│   ├── routes.js            # API endpoints, validation, rate limiting
│   ├── db.js                # DB factory: SQLite ⇄ Postgres by DATABASE_URL
│   ├── db-sqlite.js         # SQLite implementation (node:sqlite)
│   ├── db-pg.js             # PostgreSQL implementation (pg / Neon / Supabase)
│   ├── seed.js              # CSV loading, normalising, dedup, seeding
│   ├── csv.js               # Dependency-free CSV parser
│   ├── categorize.js        # Keyword classifier → browsing categories
│   └── programs.js          # Program data (single source of truth for API)
├── scripts/
│   ├── seed.js              # npm run seed [--force]
│   └── refresh.js           # npm run refresh (re-download dataset)
├── data/
│   └── prompts.csv          # prompts.chat dataset (bundled)
└── public/                  # The website (no build step)
    ├── index.html  courses.html  prompts.html  contact.html  404.html
    ├── css/style.css        # Full design system
    └── js/                  # main.js (shared), prompts.js, contact.js
```

## Customising

- **Programs, pricing, copy** → edit the HTML in `public/` and `src/programs.js`.
- **Colors / fonts** → CSS custom properties at the top of `public/css/style.css`.
- **Contact email, brand name** → search for `hello@aigrowsutra.ai` / `AIGrowSutra`.
- **Prompt categories** → `src/categorize.js` (plain keyword rules).
- **Rate limits & validation** → `src/routes.js`.

## Security notes

- All SQL is parameterised (no injection surface).
- POST endpoints are rate-limited (20 req/min per IP) and input-validated
  (name/email/length caps).
- Security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) are set.
- Stack traces are never sent to clients.

## Credits

- Prompt data: **[prompts.chat](https://prompts.chat)** /
  [github.com/f/prompts.chat](https://github.com/f/prompts.chat) — open source,
  referenced by Forbes, Harvard, and 40+ academic citations. Re-import the
  latest snapshot anytime with `npm run refresh`.
- Fonts: Sora & Inter via Google Fonts.

## License

MIT for the code in this repository. Prompt dataset remains under its upstream
open license — keep the credit link in the footer when you use it.
