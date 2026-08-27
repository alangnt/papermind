import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Environment variables - validated at runtime
function getSecretKey(): string {
  const key = process.env.SECRET_KEY;
  if (!key) throw new Error('SECRET_KEY is not defined in environment variables');
  return key;
}

function getRefreshSecretKey(): string {
  return process.env.REFRESH_SECRET_KEY || getSecretKey();
}

const ALGORITHM = (process.env.ALGORITHM || 'HS256') as jwt.Algorithm;
const REFRESH_ALGORITHM = (process.env.REFRESH_ALGORITHM || 'HS256') as jwt.Algorithm;
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);
const REFRESH_TOKEN_EXPIRE_MINUTES = parseInt(process.env.REFRESH_TOKEN_EXPIRE_MINUTES || '43200', 10);
/**
 * Decoded JWT payload. `tokenVersion` is optional so tokens issued before
 * version tracking existed still parse; treat a missing value as 0.
 */
export interface TokenPayload {
  sub: string;
  type: string;
  tokenVersion?: number;
}

/**
 * Sessions are invalidated by bumping the user's `tokenVersion`. A token is
 * only current if its version matches the one stored on the user record.
 */
export function isTokenVersionCurrent(
  payload: TokenPayload,
  storedVersion: number | undefined
): boolean {
  return (payload.tokenVersion ?? 0) === (storedVersion ?? 0);
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create an access token
 */
export function createAccessToken(
  data: { sub: string; tokenVersion: number },
  expiresInMinutes: number = ACCESS_TOKEN_EXPIRE_MINUTES
): string {
  const expiresIn = expiresInMinutes * 60; // Convert to seconds
  return jwt.sign(
    { ...data, type: 'access' },
    getSecretKey(),
    { algorithm: ALGORITHM, expiresIn }
  );
}

/**
 * Create a refresh token
 */
export function createRefreshToken(
  data: { sub: string; tokenVersion: number },
  expiresInMinutes: number = REFRESH_TOKEN_EXPIRE_MINUTES
): string {
  const expiresIn = expiresInMinutes * 60; // Convert to seconds
  return jwt.sign(
    { ...data, type: 'refresh' },
    getRefreshSecretKey(),
    { algorithm: REFRESH_ALGORITHM, expiresIn }
  );
}

/**
 * Verify an access token and return the payload
 */
export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getSecretKey(), { algorithms: [ALGORITHM] }) as TokenPayload;
  
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  
  return payload;
}

/**
 * Verify a refresh token and return the payload
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, getRefreshSecretKey(), {
    algorithms: [REFRESH_ALGORITHM],
  }) as TokenPayload;
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return payload;
}
