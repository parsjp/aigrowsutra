/**
 * Seeds the prompt library from the open-source prompts.chat dataset
 * (data/prompts.csv — https://github.com/f/prompts.chat, CC0).
 *
 * The dataset is re-normalised here: acts are trimmed, types whitelisted,
 * rows deduplicated, and every prompt is auto-categorised for browsing.
 */

const fs = require('fs');
const path = require('path');
const { csvToObjects } = require('./csv');
const { categorize } = require('./categorize');

const CSV_PATH = path.join(__dirname, '..', 'data', 'prompts.csv');
const REMOTE_CSV_URL = 'https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv';

const MAX_PROMPT_CHARS = 100000;

function normalizeRows(objects) {
  const seen = new Set();
  const rows = [];
  for (const obj of objects) {
    const act = String(obj.act || '').replace(/\s+/g, ' ').trim();
    const prompt = String(obj.prompt || '').replace(/\r\n/g, '\n').trim();
    if (act.length < 2 || prompt.length < 10 || prompt.length > MAX_PROMPT_CHARS) continue;

    const key = `${act.toLowerCase()}::${prompt.slice(0, 300)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const forDevs = String(obj.for_devs || '').toUpperCase() === 'TRUE';
    const type = String(obj.type || 'TEXT').toUpperCase().trim();
    const contributor = String(obj.contributor || '').trim().slice(0, 60);

    rows.push({
      act: act.slice(0, 160),
      prompt,
      for_devs: forDevs,
      type: ['TEXT', 'IMAGE', 'VIDEO', 'SKILL'].includes(type) ? type : 'TEXT',
      contributor,
      category: categorize(act, prompt),
    });
  }
  return rows;
}

/** Load + normalise prompt rows from the bundled CSV (or a custom path). */
function loadPromptRows(csvPath = CSV_PATH) {
  const text = fs.readFileSync(csvPath, 'utf8');
  return normalizeRows(csvToObjects(text));
}

/** Re-download the latest dataset from the prompts.chat GitHub repo. */
async function downloadDataset() {
  const res = await fetch(REMOTE_CSV_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to download dataset: HTTP ${res.status}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, text, 'utf8');
  return CSV_PATH;
}

/**
 * Ensure the store is schema-complete and (re)seeded.
 * Runs automatically on server boot; pass { force: true } to re-import.
 */
async function seedStore(store, { force = false } = {}) {
  await store.ensureSchema();
  const existing = await store.countPrompts();
  if (existing > 0 && !force) {
    return { seeded: false, count: existing };
  }
  if (force) {
    await store.clearPrompts();
  }
  const rows = loadPromptRows();
  await store.insertPrompts(rows);
  return { seeded: true, count: rows.length };
}

module.exports = { seedStore, loadPromptRows, downloadDataset, CSV_PATH };
