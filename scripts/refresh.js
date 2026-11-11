/**
 * Refresh the prompt library with the latest prompts.chat dataset.
 * Downloads the CSV from GitHub, then re-imports it.
 */
const store = require('../src/db');
const { downloadDataset, seedStore } = require('../src/seed');

(async () => {
  console.log('Downloading latest dataset from prompts.chat (github.com/f/prompts.chat)…');
  await downloadDataset();
  console.log('Dataset saved to data/prompts.csv — re-importing…');
  const result = await seedStore(store, { force: true });
  console.log(`Done. ${result.count} prompts in ${store.dialect}.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
