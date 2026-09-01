import { configDefaults, defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

/**
 * Database-backed tests run against a scratch database on the same Atlas
 * cluster, never the application one. The name is fixed here rather than read
 * from the environment so a stray MONGODB_NAME cannot point a test run at real
 * data; tests/globalSetup.ts refuses to run if this ever matches.
 */
const TEST_DATABASE = 'papermind_test';

export default defineConfig(() => {
  // '' as the prefix loads every var, not just VITE_-prefixed ones, and picks
  // up .env.local the same way `next dev` does.
  const env = loadEnv('test', process.cwd(), '');

  // `test.env` below reaches the test workers but not globalSetup, which runs
  // in this process — so the scratch database name and the connection string
  // have to be put here too, or the teardown and its safety check see nothing.
  if (env.MONGODB_URI) process.env.MONGODB_URI ??= env.MONGODB_URI;
  process.env.MONGODB_NAME = TEST_DATABASE;

  return {
    // Vite resolves the @/* alias from tsconfig natively now, so no plugin.
    resolve: { tsconfigPaths: true },
    test: {
      environment: 'node',
      globalSetup: './tests/globalSetup.ts',
      env: { ...env, MONGODB_NAME: TEST_DATABASE },
      // The DB-backed suites share one scratch database, so they must not
      // interleave; the pure suites are unaffected by this.
      fileParallelism: false,
      include: ['tests/**/*.test.ts'],
      // lib/mongodb throws at import when MONGODB_URI is missing, so a
      // *.db.test.ts file cannot skip itself — it has to be left uncollected.
      // That is what makes the suite pass on a machine with no credentials.
      exclude: [...configDefaults.exclude, ...(env.MONGODB_URI ? [] : ['**/*.db.test.ts'])],
    },
  };
});
