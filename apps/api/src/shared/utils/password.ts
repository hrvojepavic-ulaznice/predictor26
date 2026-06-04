import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const algorithm = 'pbkdf2_sha256';
const iterations = 120_000;
const keyLength = 32;
const digest = 'sha256';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');

  return `${algorithm}$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [storedAlgorithm, storedIterations, salt, hash] = storedHash.split('$');

  if (storedAlgorithm !== algorithm || !storedIterations || !salt || !hash) {
    return false;
  }

  const parsedIterations = Number(storedIterations);

  if (!Number.isInteger(parsedIterations) || parsedIterations <= 0) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, parsedIterations, Buffer.from(hash, 'hex').length, digest);
  const expected = Buffer.from(hash, 'hex');

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
