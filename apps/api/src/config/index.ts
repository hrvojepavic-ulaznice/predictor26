import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import webPush from 'web-push';

const apiRoot = fileURLToPath(new URL('../..', import.meta.url));
const nodeEnv = process.env.NODE_ENV ?? 'development';
let developmentVapidKeys: webPush.VapidKeys | null = null;

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? join(apiRoot, 'data', 'predictor26.sqlite'),
  authTokenSecret: readSecret('AUTH_TOKEN_SECRET', () => randomBytes(32).toString('base64url')),
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@predictor26.local',
  vapidPublicKey: readSecret('VAPID_PUBLIC_KEY', () => getDevelopmentVapidKeys().publicKey),
  vapidPrivateKey: readSecret('VAPID_PRIVATE_KEY', () => getDevelopmentVapidKeys().privateKey),
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME ?? 'super_admin',
  superAdminFirstName: process.env.SUPER_ADMIN_FIRST_NAME ?? 'admin',
  superAdminLastName: process.env.SUPER_ADMIN_LAST_NAME ?? 'admin',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? null,
  notificationReminderIntervalMs: Number(process.env.NOTIFICATION_REMINDER_INTERVAL_MS ?? 15 * 60 * 1000)
};

function readSecret(key: string, createDevelopmentFallback?: () => string): string {
  const value = process.env[key];

  if (value) {
    return value;
  }

  if (nodeEnv === 'production') {
    throw new Error(`${key} is required in production.`);
  }

  if (createDevelopmentFallback) {
    console.warn(`${key} is missing. Using a temporary development-only value.`);
    return createDevelopmentFallback();
  }

  throw new Error(`${key} is required. Run scripts/ensure-api-env.sh or set it in apps/api/.env.`);
}

function getDevelopmentVapidKeys(): webPush.VapidKeys {
  developmentVapidKeys ??= webPush.generateVAPIDKeys();

  return developmentVapidKeys;
}
