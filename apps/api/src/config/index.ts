import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const apiRoot = fileURLToPath(new URL('../..', import.meta.url));

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? join(apiRoot, 'data', 'predictor26.sqlite'),
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? 'predictor26-local-development-secret',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@predictor26.local',
  vapidPublicKey:
    process.env.VAPID_PUBLIC_KEY ??
    'BB-iLfzrKOOgzIJElWKhoxIL18XT_aItzifUZitwrXB2ure1Geyeoe2zcWI3EBqTCODoCgISEW-jAPrV0syDNFM',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? 'D7OS4tgNXVhwqFVsEiE8sgeS17ZWknTRFvPScFSXu0M',
  notificationReminderIntervalMs: Number(process.env.NOTIFICATION_REMINDER_INTERVAL_MS ?? 15 * 60 * 1000)
};
