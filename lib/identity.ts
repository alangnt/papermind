/**
 * Validation for the two fields that identify an account.
 *
 * Sign-up used to store whatever it was handed: an email with no `@`, a
 * 300-character username, a username of nothing but spaces. A malformed email
 * is the worst of those — password reset is the only recovery path, so the
 * account is unrecoverable the moment the password is forgotten.
 *
 * These apply to new accounts only. Existing rows are left alone: sign-in
 * matches the stored value exactly, so tightening the rules cannot lock anyone
 * out of an account they already have.
 */

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

/** Letters, digits, dot, underscore and hyphen, opening with an alphanumeric. */
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** The RFC caps an address at 254 characters. */
const EMAIL_MAX = 254;

/**
 * Deliberately loose. Anything stricter rejects valid, unusual addresses, and
 * the real proof that an address works is a message arriving at it.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const username = value.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return null;
  if (!USERNAME_PATTERN.test(username)) return null;

  return username;
}

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  // Lowercased so the same address cannot be registered twice in two casings.
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX) return null;
  if (!EMAIL_PATTERN.test(email)) return null;

  return email;
}

export const USERNAME_RULE = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters, using letters, digits, dots, underscores or hyphens, and start with a letter or digit`;

export const EMAIL_RULE = 'Enter a valid email address';

/** Escapes the regex metacharacters a username may legitimately contain. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * A case-insensitive equality filter for a username.
 *
 * The unique index is case-sensitive, so without this "Alice" could be
 * registered alongside "alice" — different accounts, indistinguishable to
 * anyone reading a group's member list.
 */
export function usernameFilter(username: string) {
  return { username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' } };
}
