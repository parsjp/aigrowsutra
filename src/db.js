/**
 * Data layer factory.
 *  - No DATABASE_URL  -> built-in SQLite (data/aigrowsutra.db, zero config)
 *  - DATABASE_URL set  -> PostgreSQL (free tier of Neon / Supabase / Railway)
 *
 * Both implementations expose the same async interface.
 */

require('./env'); // load .env (if present) before reading DATABASE_URL

const usePg = !!process.env.DATABASE_URL;
let store;
if (usePg) {
  store = require('./db-pg');
} else {
  try {
    store = require('./db-sqlite');
  } catch (err) {
    if (err && /node:sqlite|SQLite/i.test(String(err.message))) {
      console.error(
        '[db] This project needs Node.js >= 23.4 for built-in SQLite, ' +
          'or set DATABASE_URL to use a Postgres database instead.'
      );
    }
    throw err;
  }
}

module.exports = store;
