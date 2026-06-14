import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export interface ImportedMatchOdds {
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeWinOdds: number;
  readonly drawOdds: number;
  readonly awayWinOdds: number;
}

export interface OddsPortalSportData {
  readonly d?: {
    readonly rows?: OddsPortalEventRow[] | Record<string, OddsPortalEventRow>;
  };
  readonly oddsRequest?: {
    readonly url?: string;
  };
}

export interface OddsPortalEventRow {
  readonly [key: string]: unknown;
  readonly encodeEventId?: string;
  readonly 'home-name'?: string;
  readonly 'away-name'?: string;
  readonly 'date-start-timestamp'?: number;
  readonly 'date-start-base'?: number;
  readonly 'tournament-name'?: string;
  readonly venue?: string;
  readonly venueTown?: string;
  readonly 'country-name'?: string;
}

interface OddsPortalOddsResponse {
  readonly d?: {
    readonly oddsData?: Record<string, OddsPortalOddsData>;
  };
}

interface OddsPortalOddsData {
  readonly odds?: OddsPortalOutcomeOdds[];
}

interface OddsPortalOutcomeOdds {
  readonly maxOdds?: number;
}

export const worldCupOddsPortalUrl = 'https://www.oddsportal.com/football/world/world-championship-2026/';
export const friendlyInternationalOddsPortalUrl = 'https://www.oddsportal.com/football/world/friendly-international/';
const productionKey = 'J*8sQ!p$7aD_fR2yW@gHn*3bVp#sAdLd_k';
const productionSalt = '5b9a8f2c3e6d1a4b7c8e9d0f1a2b3c4d';

const browserHeaders = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

export async function importOddsPortalOdds(sourceUrl = worldCupOddsPortalUrl): Promise<ImportedMatchOdds[]> {
  const sportData = await fetchOddsPortalSportData(sourceUrl);
  const events = toArray(sportData.d?.rows);
  const oddsRequestUrl = sportData.oddsRequest?.url;

  if (!oddsRequestUrl) {
    throw new Error('OddsPortal odds request URL was not found.');
  }

  const oddsResponse = await fetch(new URL(oddsRequestUrl, sourceUrl), {
    headers: {
      ...browserHeaders,
      accept: 'application/json,text/plain,*/*',
      referer: sourceUrl
    }
  });

  if (!oddsResponse.ok) {
    throw new Error(`OddsPortal odds fetch failed with status ${oddsResponse.status}.`);
  }

  const oddsPayload = await parseOddsPayload(await oddsResponse.text());
  const oddsByEventId = oddsPayload.d?.oddsData ?? {};
  const importedOdds: ImportedMatchOdds[] = [];

  for (const event of events) {
    const encodeEventId = event.encodeEventId;
    const homeTeamName = event['home-name'];
    const awayTeamName = event['away-name'];

    if (!encodeEventId || !homeTeamName || !awayTeamName) {
      continue;
    }

    const odds = oddsByEventId[encodeEventId]?.odds;

    if (!odds || odds.length < 3) {
      continue;
    }

    const homeWinOdds = normalizeOdds(odds[0]?.maxOdds);
    const drawOdds = normalizeOdds(odds[1]?.maxOdds);
    const awayWinOdds = normalizeOdds(odds[2]?.maxOdds);

    if (!homeWinOdds || !drawOdds || !awayWinOdds) {
      continue;
    }

    importedOdds.push({
      homeTeamName,
      awayTeamName,
      homeWinOdds,
      drawOdds,
      awayWinOdds
    });
  }

  return importedOdds;
}

export async function fetchOddsPortalSportData(sourceUrl: string): Promise<OddsPortalSportData> {
  const pageResponse = await fetch(sourceUrl, {
    headers: browserHeaders
  });

  if (!pageResponse.ok) {
    throw new Error(`OddsPortal page fetch failed with status ${pageResponse.status}.`);
  }

  return parseSportData(await pageResponse.text());
}

export function oddsPortalRows(sportData: OddsPortalSportData): OddsPortalEventRow[] {
  return toArray(sportData.d?.rows);
}

function parseSportData(html: string): OddsPortalSportData {
  const sportDataMatches = html.matchAll(/<star-component\b[^>]*:sport-data="([^"]+)"/g);

  for (const match of sportDataMatches) {
    const value = decodeHtmlEntities(match[1] ?? '');

    if (!value.includes('oddsRequest')) {
      continue;
    }

    return JSON.parse(value) as OddsPortalSportData;
  }

  throw new Error('OddsPortal sport data was not found.');
}

async function parseOddsPayload(payload: string): Promise<OddsPortalOddsResponse> {
  const trimmed = payload.trim();

  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as OddsPortalOddsResponse;
  }

  return JSON.parse(decryptOddsPayload(trimmed)) as OddsPortalOddsResponse;
}

function decryptOddsPayload(payload: string): string {
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
  const [encryptedBase64, ivHex] = decodedPayload.split(':');

  if (!encryptedBase64 || !ivHex) {
    throw new Error('OddsPortal odds payload format is invalid.');
  }

  const key = pbkdf2Sync(productionKey, productionSalt, 1000, 32, 'sha256');
  const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
  const uncompressed = decrypted.length >= 2 && decrypted[0] === 31 && decrypted[1] === 139 ? gunzipSync(decrypted) : decrypted;

  return uncompressed.toString('utf8');
}

function normalizeOdds(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 1) {
    return null;
  }

  return Number(value.toFixed(2));
}

function toArray<T>(value: readonly T[] | Record<string, T> | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? [...value] : Object.values(value);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_entity, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_entity, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
}
