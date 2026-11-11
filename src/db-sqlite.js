/**
 * SQLite implementation of the data layer.
 * Uses Node's built-in `node:sqlite` (Node >= 23.4, stable in Node 24) —
 * zero native dependencies, zero configuration. The database file lives at
 * data/aigrowsutra.db and is created + seeded automatically on first run.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'data', 'aigrowsutra.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    program TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const TYPE_WHITELIST = new Set(['TEXT', 'IMAGE', 'VIDEO', 'SKILL']);

class SqliteStore {
  constructor() {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    this.db = new DatabaseSync(DB_FILE);
    this.db.exec('PRAGMA busy_timeout = 5000;');
  }

  get dialect() {
    return 'sqlite';
  }

  ensureSchema() {
    this.db.exec(SCHEMA);
  }

  async countPrompts() {
    return this.db.prepare('SELECT COUNT(*) AS c FROM prompts').get().c;
  }

  async clearPrompts() {
    this.db.exec('DELETE FROM prompts;');
  }

  async insertPrompts(rows) {
    if (!rows.length) return 0;
    const stmt = this.db.prepare(
      'INSERT INTO prompts (act, prompt, for_devs, type, contributor, category) VALUES (?, ?, ?, ?, ?, ?)'
    );
    this.db.exec('BEGIN;');
    try {
      for (const r of rows) {
        stmt.run(
          r.act,
          r.prompt,
          r.for_devs ? 1 : 0,
          TYPE_WHITELIST.has(r.type) ? r.type : 'TEXT',
          r.contributor || '',
          r.category
        );
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    return rows.length;
  }

  /**
   * Search the prompt library.
   * q: free text (matched against act + prompt, title matches ranked first)
   * category / type: exact match. devs: "1" for developer-only prompts.
   */
  async searchPrompts({ q = '', category = '', type = '', devs = '', limit = 24, offset = 0 }) {
    const where = [];
    const params = [];
    if (q) {
      const like = `%${q}%`;
      where.push('(act LIKE ? OR prompt LIKE ?)');
      params.push(like, like);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (type) {
      where.push('type = ?');
      params.push(type);
    }
    if (devs === '1') {
      where.push('for_devs = 1');
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = this.db
      .prepare(`SELECT COUNT(*) AS c FROM prompts ${whereSql}`)
      .get(...params).c;

    const rankParam = q ? `%${q}%` : '';
    const items = this.db
      .prepare(
        `SELECT id, act, prompt, category, type, for_devs, contributor
         FROM prompts ${whereSql}
         ORDER BY ${q ? '(act LIKE ?) DESC, ' : ''}act ASC
         LIMIT ? OFFSET ?`
      )
      .all(...(q ? [rankParam, ...params, Number(limit), Number(offset)] : [...params, Number(limit), Number(offset)]));

    return { total, items };
  }

  async facets() {
    const categories = this.db
      .prepare('SELECT category AS name, COUNT(*) AS count FROM prompts GROUP BY category ORDER BY count DESC')
      .all();
    const types = this.db
      .prepare('SELECT type AS name, COUNT(*) AS count FROM prompts GROUP BY type ORDER BY count DESC')
      .all();
    const totalPrompts = await this.countPrompts();
    return { totalPrompts, categories, types };
  }

  async stats() {
    const one = (sql) => this.db.prepare(sql).get().c;
    return {
      prompts: one('SELECT COUNT(*) AS c FROM prompts'),
      leads: one('SELECT COUNT(*) AS c FROM leads'),
      subscribers: one('SELECT COUNT(*) AS c FROM subscribers'),
    };
  }

  async insertLead({ name, email, phone, program, message }) {
    const result = this.db
      .prepare(
        'INSERT INTO leads (name, email, phone, program, message) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name, email, phone || '', program || '', message || '');
    return { id: Number(result.lastInsertRowid) };
  }

  async insertSubscriber(email) {
    const existing = this.db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
    if (existing) return { id: existing.id, inserted: false };
    const result = this.db
      .prepare('INSERT INTO subscribers (email) VALUES (?)')
      .run(email);
    return { id: Number(result.lastInsertRowid), inserted: true };
  }
}

module.exports = new SqliteStore();
