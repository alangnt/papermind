import { describe, expect, it } from 'vitest';

/**
 * A tripwire, not a unit test. Everything database-backed writes and drops
 * collections, so a run pointed at the application database would destroy real
 * data. vitest.config.mts hardcodes the name for this reason; this asserts the
 * wiring still holds.
 */
describe('test database wiring', () => {
  it('never targets the application database', () => {
    expect(process.env.MONGODB_NAME).not.toBe('Astra');
  });

  it('targets the scratch database', () => {
    expect(process.env.MONGODB_NAME).toBe('papermind_test');
  });
});
