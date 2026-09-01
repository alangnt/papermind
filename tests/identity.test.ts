import { describe, expect, it } from 'vitest';

import { normaliseEmail, normaliseUsername, usernameFilter } from '@/lib/identity';
import { validatePasswordStrength } from '@/lib/password';

describe('normaliseUsername', () => {
  it.each(['alice', 'Alice_99', 'a.b-c', 'abc'])('accepts %s', (input) => {
    expect(normaliseUsername(input)).toBe(input);
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseUsername('  alice  ')).toBe('alice');
  });

  it.each([
    ['   ', 'only whitespace'],
    ['ab', 'shorter than three characters'],
    ['x'.repeat(31), 'longer than thirty characters'],
    ['_leading', 'does not start with a letter or digit'],
    ['has space', 'contains a space'],
    ['emoji😀', 'contains an emoji'],
    ['semi;colon', 'contains punctuation outside the allowed set'],
    ['', 'empty'],
  ])('rejects %s (%s)', (input) => {
    expect(normaliseUsername(input)).toBeNull();
  });

  it.each([undefined, null, 42, {}, [], { $ne: null }])('rejects the non-string %s', (input) => {
    expect(normaliseUsername(input)).toBeNull();
  });
});

describe('normaliseEmail', () => {
  it('lowercases so one address cannot be registered twice', () => {
    expect(normaliseEmail('  Alice@Example.COM ')).toBe('alice@example.com');
  });

  it.each(['a@b.co', 'first.last+tag@sub.domain.org'])('accepts %s', (input) => {
    expect(normaliseEmail(input)).toBe(input.toLowerCase());
  });

  it.each([
    ['notanemail', 'no @ at all'],
    ['no@domain', 'no dot in the domain'],
    ['@example.com', 'no local part'],
    ['a b@example.com', 'contains a space'],
    ['', 'empty'],
    [`${'x'.repeat(250)}@example.com`, 'longer than the RFC limit'],
  ])('rejects %s (%s)', (input) => {
    expect(normaliseEmail(input)).toBeNull();
  });

  it.each([undefined, null, 42, { $ne: null }])('rejects the non-string %s', (input) => {
    expect(normaliseEmail(input)).toBeNull();
  });
});

describe('usernameFilter', () => {
  it('matches the whole string, case-insensitively', () => {
    const { username } = usernameFilter('alice');
    expect(new RegExp(username.$regex, username.$options).test('ALICE')).toBe(true);
    expect(new RegExp(username.$regex, username.$options).test('alicex')).toBe(false);
    expect(new RegExp(username.$regex, username.$options).test('xalice')).toBe(false);
  });

  // A dot is legal in a username and is also a regex wildcard.
  it('escapes characters that are legal in a username but special in a regex', () => {
    const { username } = usernameFilter('a.b');
    const pattern = new RegExp(username.$regex, username.$options);
    expect(pattern.test('a.b')).toBe(true);
    expect(pattern.test('axb')).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordStrength('TestPassword123').isValid).toBe(true);
  });

  it.each([
    ['short1A', 'too short'],
    ['alllowercase1', 'no uppercase'],
    ['ALLUPPERCASE1', 'no lowercase'],
    ['NoDigitsHere', 'no digit'],
  ])('rejects %s (%s)', (input) => {
    expect(validatePasswordStrength(input).isValid).toBe(false);
  });

  it('rejects a password long enough to be a denial-of-service payload', () => {
    const result = validatePasswordStrength(`Aa1${'x'.repeat(300)}`);
    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/at most 200/);
  });
});
