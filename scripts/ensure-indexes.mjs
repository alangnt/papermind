/**
 * Creates the indexes the app relies on. Idempotent: safe to re-run.
 *
 * Usage:  MONGODB_URI="..." node scripts/ensure-indexes.mjs
 *         bun run db:indexes            (reads .env.local)
 *
 * Pass --dry-run to report what would change without writing.
 *
 * Unique index creation FAILS if duplicates already exist. That is deliberate:
 * it surfaces the bad data instead of silently skipping. Resolve the reported
 * duplicates, then re-run.
 *
 * NOTE: the database name is hardcoded to match lib/mongodb.ts, which ignores
 * MONGODB_NAME. If that is ever fixed, fix it here too.
 */
import { MongoClient } from 'mongodb';

const DB_NAME = 'Astra';
const DRY_RUN = process.argv.includes('--dry-run');

const INDEXES = [
  { collection: 'users', spec: { username: 1 }, options: { name: 'username_unique', unique: true } },
  { collection: 'users', spec: { email: 1 }, options: { name: 'email_unique', unique: true } },
];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const client = new MongoClient(uri);

/** Report duplicates so a failed unique build is actionable, not just an error code. */
async function findDuplicates(collection, field) {
  return collection
    .aggregate([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    .toArray();
}

try {
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`database: ${DB_NAME}${DRY_RUN ? '  (dry run)' : ''}\n`);

  let failed = 0;

  for (const { collection: name, spec, options } of INDEXES) {
    const collection = db.collection(name);
    const field = Object.keys(spec)[0];
    const label = `${name}.${field}`;

    const existing = await collection.indexExists(options.name);
    if (existing) {
      console.log(`= ${label}: ${options.name} already present`);
      continue;
    }

    if (options.unique) {
      const duplicates = await findDuplicates(collection, field);
      if (duplicates.length > 0) {
        failed++;
        console.error(`x ${label}: ${duplicates.length} duplicate value(s), cannot build unique index`);
        for (const d of duplicates) console.error(`    ${JSON.stringify(d._id)} appears ${d.count}x`);
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`+ ${label}: would create ${options.name}`);
      continue;
    }

    await collection.createIndex(spec, options);
    console.log(`+ ${label}: created ${options.name}`);
  }

  if (failed > 0) {
    console.error(`\n${failed} index(es) not created. Resolve the duplicates above and re-run.`);
    process.exit(1);
  }
  console.log('\nall indexes in place');
} finally {
  await client.close();
}
