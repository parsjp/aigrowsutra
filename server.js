/**
 * AIGrowSutra — full-stack server.
 * Serves the JSON API (/api/*), the static frontend (public/),
 * and auto-initialises the database on boot.
 */

const path = require('path');
const express = require('express');
const { router: apiRouter, initDb } = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Basic security headers.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use('/api', apiRouter);

app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    // Always revalidate with the server (ETag → instant 304s when unchanged).
    // Without this, browsers heuristic-cache files and visitors can see stale
    // pages after a deploy.
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  })
);

// SPA-ish fallback: unknown paths go to a friendly 404 page.
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Centralised error handler — never leak stack traces to clients.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[server]', err);
  if (res.headersSent) return;
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  AIGrowSutra running → http://localhost:${PORT}`);
      console.log(`  API health        → http://localhost:${PORT}/api/health`);
      console.log(`  Prompt library    → http://localhost:${PORT}/api/prompts\n`);
    });
  })
  .catch((err) => {
    console.error('[server] Failed to initialise database:', err);
    process.exit(1);
  });
