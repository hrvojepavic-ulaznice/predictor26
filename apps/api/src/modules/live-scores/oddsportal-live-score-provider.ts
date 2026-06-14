import {
  fetchOddsPortalSportData,
  oddsPortalRows,
  OddsPortalEventRow,
  worldCupOddsPortalUrl
} from '../admin-matches/oddsportal-odds-importer.js';

export type ProviderLiveScoreStatus = 'scheduled' | 'live' | 'finished' | 'unknown';

export interface ProviderLiveScore {
  readonly provider: 'oddsportal';
  readonly providerEventId: string | null;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly kickoffAt: string | null;
  readonly status: ProviderLiveScoreStatus;
  readonly rawStatus: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly rawPayload: OddsPortalEventRow;
}

export async function fetchOddsPortalLiveScores(sourceUrl = worldCupOddsPortalUrl): Promise<ProviderLiveScore[]> {
  const sportData = await fetchOddsPortalSportData(sourceUrl);

  return oddsPortalRows(sportData).flatMap(toProviderLiveScore);
}

function toProviderLiveScore(row: OddsPortalEventRow): ProviderLiveScore[] {
  const homeTeamName = row['home-name'];
  const awayTeamName = row['away-name'];

  if (typeof homeTeamName !== 'string' || typeof awayTeamName !== 'string') {
    return [];
  }

  const kickoffTimestamp = readNumber(row['date-start-timestamp']) ?? readNumber(row['date-start-base']);
  const rawStatus = readRawStatus(row);
  const homeScore = readScore(row, ['home-score', 'homeScore', 'homeResult', 'home-result', 'home-result-current', 'homeResultCurrent']);
  const awayScore = readScore(row, ['away-score', 'awayScore', 'awayResult', 'away-result', 'away-result-current', 'awayResultCurrent']);
  const status = readStatus(row, rawStatus, homeScore, awayScore);

  return [
    {
      provider: 'oddsportal',
      providerEventId: typeof row.encodeEventId === 'string' ? row.encodeEventId : null,
      homeTeamName,
      awayTeamName,
      kickoffAt: kickoffTimestamp ? new Date(kickoffTimestamp * 1000).toISOString() : null,
      status,
      rawStatus,
      homeScore,
      awayScore,
      rawPayload: row
    }
  ];
}

function readRawStatus(row: OddsPortalEventRow): string | null {
  const directStatus = readString(row, [
    'status',
    'status-name',
    'statusName',
    'event-status',
    'event-status-name',
    'eventStatusName',
    'event-stage-name',
    'eventStageName',
    'state',
    'stage'
  ]);

  if (directStatus) {
    return directStatus;
  }

  const timeValue = readString(row, ['time', 'time-status', 'timeStatus', 'minute', 'live-time', 'liveTime']);
  return timeValue;
}

function readStatus(
  row: OddsPortalEventRow,
  rawStatus: string | null,
  homeScore: number | null,
  awayScore: number | null
): ProviderLiveScoreStatus {
  const normalized = normalizeStatus(rawStatus);

  if (/\b(ft|aet|ap|finished|ended|afterpenalties|fulltime|finishedafterextratime)\b/.test(normalized)) {
    return 'finished';
  }

  if (/\b(live|inplay|1sthalf|2ndhalf|halftime|half-time|extratime|penalties)\b/.test(normalized)) {
    return 'live';
  }

  if (readBoolean(row, ['inplay', 'in-play', 'isLive', 'is-live', 'live'])) {
    return 'live';
  }

  if (homeScore !== null && awayScore !== null && rawStatus) {
    return 'live';
  }

  return homeScore === null || awayScore === null ? 'scheduled' : 'unknown';
}

function readScore(row: OddsPortalEventRow, keys: readonly string[]): number | null {
  for (const key of keys) {
    const directValue = readNumber(row[key]);

    if (directValue !== null && Number.isInteger(directValue) && directValue >= 0) {
      return directValue;
    }
  }

  const scoreText = readString(row, ['score', 'result', 'current-score', 'currentScore']);

  if (!scoreText) {
    return null;
  }

  const [home, away] = scoreText.match(/\d+/g)?.map(Number) ?? [];
  const isHomeKey = keys.some((key) => key.toLowerCase().includes('home'));
  const value = isHomeKey ? home : away;

  return Number.isInteger(value) && value >= 0 ? value : null;
}

function readString(row: OddsPortalEventRow, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readBoolean(row: OddsPortalEventRow, keys: readonly string[]): boolean {
  return keys.some((key) => row[key] === true || row[key] === 1 || row[key] === '1' || row[key] === 'true');
}

function normalizeStatus(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();
}
