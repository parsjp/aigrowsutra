/**
 * Standalone seeding CLI.
 *   node scripts/seed.js           -> seed only if the library is empty
 *   node scripts/seed.js --force   -> wipe and re-import the dataset
 */
const store = require('../src/db');
const { seedStore } = require('../src/seed');

(async () => {
  const force = process.argv.includes('--force');
  const result = await seedStore(store, { force });
  console.log(
    result.seeded
      ? `Seeded ${result.count} prompts into ${store.dialect}.`
      : `Library already has ${result.count} prompts (use --force to re-import).`
  );
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
