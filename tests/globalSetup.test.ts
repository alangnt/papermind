import { describe, expect, it } from 'vitest';

import { assertScratchDatabase } from './globalSetup';

describe('assertScratchDatabase', () => {
  it('refuses the application database', () => {
    expect(() => assertScratchDatabase('Astra')).toThrow(/Refusing to run tests/);
  });

  it('refuses an unset name, which would otherwise fall back to a default', () => {
    expect(() => assertScratchDatabase(undefined)).toThrow(/\(unset\)/);
    expect(() => assertScratchDatabase('')).toThrow(/Refusing to run tests/);
  });

  it('allows the scratch database', () => {
    expect(() => assertScratchDatabase('papermind_test')).not.toThrow();
  });
});
