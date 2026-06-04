import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const apiRoot = fileURLToPath(new URL('../..', import.meta.url));

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? join(apiRoot, 'data', 'predictor26.sqlite'),
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? 'predictor26-local-development-secret'
};
