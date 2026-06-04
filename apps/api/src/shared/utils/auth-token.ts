import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../../config/index.js';

const tokenVersion = 'v1';

export interface AuthTokenPayload {
  readonly userId: number;
  readonly username: string;
  readonly role: string;
}

export function createAuthToken(payload: AuthTokenPayload): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${tokenVersion}.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [version, encodedPayload, signature] = token.split('.');

  if (version !== tokenVersion || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as AuthTokenPayload;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac('sha256', config.authTokenSecret).update(value).digest('base64url');
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}
