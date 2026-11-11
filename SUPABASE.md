# Supabase Setup — save AIGrowSutra data in the cloud (free)

Right now the app saves data in a **local SQLite file** on your computer
(`data/aigrowsutra.db`). This guide moves everything into your own free
**Supabase** PostgreSQL database — 500 MB free storage, permanent, accessible
from anywhere (perfect for when the site is hosted on Render).

The app already speaks Supabase: as soon as `DATABASE_URL` is set, it
automatically creates the tables and imports all 2,953 prompts on first boot.
No SQL to run manually.

---

## Step 1 — Create the free project (≈ 3 minutes)

1. Go to **https://supabase.com** → **Start your project** → sign up free
   (GitHub login is fastest).
2. **Create a project**:
   - Name: `aigrowsutra`
   - Database Password: pick a strong one and **save it** (you'll need it)
   - Region: choose the closest to you (e.g. `Mumbai` / `ap-south-1` for India)
3. Wait ~2 minutes while Supabase provisions the database.

## Step 2 — Copy the connection string

1. In your project: **Project Settings** (⚙️) → **Database**
2. Scroll to **Connection string** → choose **Session pooler**
3. Copy the **URI**. It looks like:

   ```
   postgresql://postgres.abcdefghijk:YOUR-PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

4. Replace `YOUR-PASSWORD` (or `[YOUR-PASSWORD]`) with the database password
   you chose in step 1.

## Step 3 — Give it to the app

**On your computer (local testing):**

1. Create a file named `.env` in the project root
   (`C:\...\Default Project\aigrowsutra\.env`) containing one line:

   ```
   DATABASE_URL=postgresql://postgres.abcdefghijk:yourpassword@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

2. Restart the app: `npm start`

   → The console will show `dialect=postgres` and seed
   `2,953 prompts (seeded from prompts.chat dataset)` into Supabase.

**On Render (free hosting):**

Render dashboard → your service → **Environment** → add:

```
DATABASE_URL = <the same connection string>
```

Redeploy. Same auto-seed happens there.

## Step 4 — Verify

- Local: `http://localhost:3000/api/health` → `"db": "postgres"`
- Supabase dashboard → **Table Editor** → you'll see the tables:
  - `prompts` — 2,953 rows
  - `leads` — every contact-form submission
  - `subscribers` — every newsletter signup
- Submit the contact form on the site → refresh Table Editor → your row appears. ✅

---

## Good to know

- **Free tier limits:** 2 projects, 500 MB database, 50k monthly active users
  (way more than this site needs — our prompt data is ~11 MB).
- **Auto-pause:** free Supabase projects pause after ~7 days with no traffic.
  If the site shows a database error, open the Supabase dashboard and click
  **Restore project** — takes ~1 minute. (Visiting the site regularly keeps it awake.)
- **Security:** the connection string is a server-side secret — it's in
  `.env` which is already in `.gitignore`, and on Render it's an encrypted
  environment variable. Never put it in frontend code.
- **Change the password anytime:** Supabase → Settings → Database → reset
  database password, then update `.env` and Render.

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed` | Password in the string doesn't match — reset it in Supabase settings and re-copy |
| `relation "prompts" does not exist` | Normal on very first boot — the app creates tables automatically; refresh |
| `connection timed out` | Make sure you used the **pooler** URI (not IPv6-only direct URL), or try the Transaction pooler (port 6543) |
| Seeding is slow | First boot imports 2,953 rows (~30–60 s on free tier). Subsequent boots are instant. |
