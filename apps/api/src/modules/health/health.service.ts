import { config } from '../../config/index.js';
import { HealthResponse } from './health.interfaces.js';
import { getSchemaVersion } from './health.repository.js';

export async function getHealth(): Promise<HealthResponse> {
  return {
    status: 'ok',
    environment: config.nodeEnv,
    database: {
      connected: true,
      schemaVersion: await getSchemaVersion()
    },
    timestamp: new Date().toISOString()
  };
}
