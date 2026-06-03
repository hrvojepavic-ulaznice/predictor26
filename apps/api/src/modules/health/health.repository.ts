import { getAppMetadataValue } from '../../database/queries/app-metadata.queries.js';

export async function getSchemaVersion(): Promise<string> {
  return (await getAppMetadataValue('schema_version')) ?? 'unknown';
}
