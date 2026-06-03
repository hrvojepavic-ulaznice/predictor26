export interface HealthResponse {
  status: 'ok';
  environment: string;
  database: {
    connected: boolean;
    schemaVersion: string;
  };
  timestamp: string;
}
