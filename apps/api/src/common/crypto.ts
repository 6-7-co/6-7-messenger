import { createHash, randomBytes, timingSafeEqual, scryptSync } from 'crypto';

const SCRYPT_KEYLEN = 64;

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return Promise.resolve(`scrypt$${salt}$${derived}`);
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export const cryptoUtils = { hashPassword, verifyPassword, sha256 };
