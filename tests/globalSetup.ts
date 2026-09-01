import { MongoClient } from 'mongodb';

/** The application database. Tests must never point at it. */
const PROTECTED_DATABASE = 'Astra';

/**
 * Exported so it can be unit-tested directly: proving this by pointing a real
 * run at the application database is not an experiment worth running.
 */
export function assertScratchDatabase(name: string | undefined): asserts name is string {
  if (!name || name === PROTECTED_DATABASE) {
    throw new Error(
      `Refusing to run tests against database ${name ?? '(unset)'} — check vitest.config.mts`
    );
  }
}

/**
 * Wipes the scratch database before and after the run, so suites start from a
 * known state and nothing is left on the cluster afterwards.
 *
 * Does nothing when MONGODB_URI is absent: vitest.config.mts leaves the
 * database-backed suites uncollected in that case, so there is nothing to set up.
 */
async function dropTestDatabase() {
  const uri = process.env.MONGODB_URI;
  const name = process.env.MONGODB_NAME;

  if (!uri) return;

  assertScratchDatabase(name);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db(name).dropDatabase();
  } finally {
    await client.close();
  }
}

export async function setup() {
  await dropTestDatabase();
}

export async function teardown() {
  await dropTestDatabase();
}
