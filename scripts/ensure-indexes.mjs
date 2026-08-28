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
 */
import { MongoClient } from 'mongodb';
const DRY_RUN = process.argv.includes('--dry-run');

const INDEXES = [
  { collection: 'users', spec: { username: 1 }, options: { name: 'username_unique', unique: true } },
  { collection: 'users', spec: { email: 1 }, options: { name: 'email_unique', unique: true } },
  {
    collection: 'articles',
    spec: { arxiv_id: 1 },
    options: { name: 'arxiv_id_unique', unique: true },
  },
  // Sitemap: most-viewed articles first.
  {
    collection: 'articles',
    spec: { view_count: -1, 'document.published': -1 },
    options: { name: 'articles_by_views' },
  },
  // "More in <category>" on the article page.
  {
    collection: 'articles',
    spec: { 'document.category': 1, 'document.published': -1 },
    options: { name: 'articles_by_category' },
  },
];

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

// Matches lib/mongodb.ts: no fallback, so this can never index the wrong database.
const DB_NAME = process.env.MONGODB_NAME;
if (!DB_NAME) {
  console.error('MONGODB_NAME is not set');
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

  // indexExists() and aggregate() both throw on a namespace that does not exist,
  // which is the normal state of a brand-new database.
  const existingCollections = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)
  );

  for (const { collection: name, spec, options } of INDEXES) {
    const collection = db.collection(name);
    const field = Object.keys(spec)[0];
    const label = `${name}.${field}`;
    const collectionExists = existingCollections.has(name);

    if (collectionExists && (await collection.indexExists(options.name))) {
      console.log(`= ${label}: ${options.name} already present`);
      continue;
    }

    // A collection that does not exist yet cannot hold duplicates.
    if (options.unique && collectionExists) {
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
