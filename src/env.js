/**
 * Tiny dependency-free .env loader (run before db.js reads DATABASE_URL).
 * Reads KEY=VALUE lines from the project's .env file if it exists.
 * Existing environment variables always win (host dashboards set these).
 */

const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
} catch (_) {
  /* Best-effort: a broken .env should never crash the app. */
}

module.exports = null;
