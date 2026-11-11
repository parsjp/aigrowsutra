/**
 * JSON API for AIGrowSutra.
 *
 *   GET  /api/health            -> service + database status
 *   GET  /api/stats             -> public counters
 *   GET  /api/programs          -> the four flagship programs
 *   GET  /api/prompts/facets    -> categories & types with counts
 *   GET  /api/prompts           -> searchable, paginated prompt library
 *   POST /api/leads             -> enrollment / contact form submissions
 *   POST /api/newsletter        -> newsletter signups
 */

const express = require('express');
const store = require('./db');
const { seedStore } = require('./seed');
const { programs } = require('./programs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* Tiny in-memory rate limiter for POST endpoints (20 req/min per IP). */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times[times.length - 1] < windowStart) hits.delete(key);
    }
  }
  return list.length > 20;
}
/* ------------------------------------------------------------------ */

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'aigrowsutra', db: store.dialect, time: new Date().toISOString() });
});

router.get('/stats', async (req, res, next) => {
  try {
    res.json(await store.stats());
  } catch (err) {
    next(err);
  }
});

router.get('/programs', (req, res) => {
  res.json({ programs });
});

router.get('/prompts/facets', async (req, res, next) => {
  try {
    res.json(await store.facets());
  } catch (err) {
    next(err);
  }
});

router.get('/prompts', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 120);
    const category = String(req.query.category || '').trim().slice(0, 60);
    const type = String(req.query.type || '').trim().toUpperCase().slice(0, 16);
    const devs = req.query.devs === '1' ? '1' : '';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 500);
    const offset = (page - 1) * limit;

    const { total, items } = await store.searchPrompts({ q, category, type, devs, limit, offset });
    res.json({ total, page, limit, items });
  } catch (err) {
    next(err);
  }
});

router.post('/leads', async (req, res, next) => {
  try {
    if (rateLimited(req.ip)) {
      return res.status(429).json({ ok: false, error: 'Too many requests — please try again in a minute.' });
    }
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 80);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
    const phone = String(body.phone || '').trim().slice(0, 24);
    const program = String(body.program || '').trim().slice(0, 80);
    const message = String(body.message || '').trim().slice(0, 2000);

    const errors = {};
    if (name.length < 2) errors.name = 'Please tell us your name.';
    if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';
    if (Object.keys(errors).length) {
      return res.status(400).json({ ok: false, errors });
    }

    const { id } = await store.insertLead({ name, email, phone, program, message });
    res.status(201).json({ ok: true, id, message: 'Thanks! We received your application.' });
  } catch (err) {
    next(err);
  }
});

router.post('/newsletter', async (req, res, next) => {
  try {
    if (rateLimited(req.ip)) {
      return res.status(429).json({ ok: false, error: 'Too many requests — please try again in a minute.' });
    }
    const email = String((req.body || {}).email || '').trim().toLowerCase().slice(0, 160);
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }
    const { inserted } = await store.insertSubscriber(email);
    res.status(201).json({
      ok: true,
      inserted,
      message: inserted ? "You're on the list — welcome aboard!" : "You're already subscribed.",
    });
  } catch (err) {
    next(err);
  }
});

/** Initialise schema + auto-seed the prompt library on first boot. */
async function initDb() {
  const result = await seedStore(store);
  console.log(
    `[db] dialect=${store.dialect} prompts=${result.count}${result.seeded ? ' (seeded from prompts.chat dataset)' : ''}`
  );
  return result;
}

module.exports = { router, initDb };
