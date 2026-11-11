/**
 * PostgreSQL implementation of the data layer (used when DATABASE_URL is set).
 * Works with any free-tier cloud Postgres such as Neon (https://neon.tech)
 * or Supabase (https://supabase.com) — recommended on free hosting like
 * Render, where the local filesystem (and thus a SQLite file) is ephemeral.
 *
 * Exposes exactly the same async interface as db-sqlite.js.
 */

const { Pool } = require('pg');

const TYPE_WHITELIST = new Set(['TEXT', 'IMAGE', 'VIDEO', 'SKILL']);

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    act TEXT NOT NULL,
    prompt TEXT NOT NULL,
    for_devs INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'TEXT',
    contributor TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General'
  );
  CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
  CREATE INDEX IF NOT EXISTS idx_prompts_type ON prompts(type);

  CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    program TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

class PgStore {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    this.pool = new Pool({
      connectionString,
      max: 5,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }

  get dialect() {
    return 'postgres';
  }

  async ensureSchema() {
    await this.pool.query(SCHEMA);
  }

  async countPrompts() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS c FROM prompts');
    return rows[0].c;
  }

  async clearPrompts() {
    await this.pool.query('TRUNCATE prompts RESTART IDENTITY;');
  }

  async insertPrompts(rows) {
    if (!rows.length) return 0;
    const CHUNK = 250;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const values = [];
        const params = [];
        chunk.forEach((r, idx) => {
          const base = idx * 6;
          values.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
          );
          params.push(
            r.act,
            r.prompt,
            r.for_devs ? 1 : 0,
            TYPE_WHITELIST.has(r.type) ? r.type : 'TEXT',
            r.contributor || '',
            r.category
          );
        });
        await client.query(
          `INSERT INTO prompts (act, prompt, for_devs, type, contributor, category) VALUES ${values.join(',')}`,
          params
        );
      }
      await client.query('COMMIT;');
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
    return rows.length;
  }

  async searchPrompts({ q = '', category = '', type = '', devs = '', limit = 24, offset = 0 }) {
    const where = [];
    const params = [];
    if (q) {
      const like = `%${q}%`;
      params.push(like);
      const a = params.length;
      params.push(like);
      const b = params.length;
      where.push(`(act ILIKE $${a} OR prompt ILIKE $${b})`);
    }
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (type) {
      params.push(type);
      where.push(`type = $${params.length}`);
    }
    if (devs === '1') {
      where.push('for_devs = 1');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: countRows } = await this.pool.query(
      `SELECT COUNT(*)::int AS c FROM prompts ${whereSql}`,
      params
    );
    const total = countRows[0].c;

    let orderBy = 'ORDER BY act ASC';
    const orderParams = [...params];
    if (q) {
      const like = `%${q}%`;
      orderParams.push(like);
      const t = orderParams.length;
      orderBy = `ORDER BY (act ILIKE $${t}) DESC, act ASC`;
    }
    orderParams.push(Number(limit), Number(offset));
    const limitN = orderParams.length - 1;
    const offsetN = orderParams.length;

    const { rows: items } = await this.pool.query(
      `SELECT id, act, prompt, category, type, for_devs, contributor
       FROM prompts ${whereSql} ${orderBy} LIMIT $${limitN} OFFSET $${offsetN}`,
      orderParams
    );
    return { total, items };
  }

  async facets() {
    const { rows: categories } = await this.pool.query(
      'SELECT category AS name, COUNT(*)::int AS count FROM prompts GROUP BY category ORDER BY count DESC'
    );
    const { rows: types } = await this.pool.query(
      'SELECT type AS name, COUNT(*)::int AS count FROM prompts GROUP BY type ORDER BY count DESC'
    );
    const totalPrompts = await this.countPrompts();
    return { totalPrompts, categories, types };
  }

  async stats() {
    const { rows } = await this.pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM prompts) AS prompts,
        (SELECT COUNT(*)::int FROM leads) AS leads,
        (SELECT COUNT(*)::int FROM subscribers) AS subscribers`
    );
    return rows[0];
  }

  async insertLead({ name, email, phone, program, message }) {
    const { rows } = await this.pool.query(
      'INSERT INTO leads (name, email, phone, program, message) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, email, phone || '', program || '', message || '']
    );
    return { id: rows[0].id };
  }

  async insertSubscriber(email) {
    const { rows } = await this.pool.query(
      `INSERT INTO subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, (xmax = 0) AS inserted`,
      [email]
    );
    return { id: rows[0].id, inserted: rows[0].inserted === true };
  }
}

module.exports = new PgStore();
