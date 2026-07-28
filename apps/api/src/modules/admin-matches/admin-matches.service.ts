import { MatchOddsInput, MatchRow } from '../../database/queries/matches.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { MatchResponse } from '../matches/matches.interfaces.js';
import {
  AdminActionSecretRequest,
  AdminMatchesResponse,
  ImportMatchesResponse,
  SyncMatchOddsResponse,
  UpdateFinalScoreRequest,
  UpdateKickoffRequest,
  UpdatePlayoffMappingRequest
} from './admin-matches.interfaces.js';
import {
  backfillPredictionOdds,
  clearPendingFinalScores,
  clearPendingPredictions,
  findAdminMatches,
  findSuperAdminForSecretCode,
  getMetadataValue,
  applyTeamLogosToMatches,
  importMatches,
  importTeams,
  setFinalScore,
  setKickoff,
  setPlayoffTeamMapping,
  setMetadataValue,
  setMatchOdds
} from './admin-matches.repository.js';
import {
  ImportedMatchOdds,
  importOddsPortalOdds
} from './oddsportal-odds-importer.js';
import { importOddsPortalSchedule } from './oddsportal-schedule-importer.js';
import { findCompetitionForAdmin } from '../competitions/competitions.repository.js';

const worldCupPendingDataCleanupMetadataKey = 'admin_matches_world_cup_pending_data_cleanup';
const worldCupPendingDataCleanupVersion = '1';

type SecretCodeResult =
  | {
      readonly status: 'valid';
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export type ImportScheduleResult =
  | {
      readonly status: 'imported';
      readonly response: ImportMatchesResponse;
    }
  | Exclude<SecretCodeResult, { readonly status: 'valid' }>;

export type SyncOddsResult =
  | {
      readonly status: 'synced';
      readonly response: SyncMatchOddsResponse;
    }
  | Exclude<SecretCodeResult, { readonly status: 'valid' }>;

interface MatchOddsSyncPlan {
  readonly odds: MatchOddsInput[];
  readonly matched: number;
  readonly skippedExisting: number;
  readonly skippedFinished: number;
  readonly skippedUnresolved: number;
  readonly unmatched: number;
}

export type UpdateFinalScoreResult =
  | {
      readonly status: 'updated';
      readonly match: MatchResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
  };

export type UpdateKickoffResult =
  | {
      readonly status: 'updated';
      readonly match: MatchResponse;
    }
  | Exclude<SecretCodeResult, { readonly status: 'valid' }>
  | {
      readonly status: 'not_found';
    };

export type UpdatePlayoffMappingResult =
  | {
      readonly status: 'updated';
      readonly match: MatchResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    };

export async function getAdminMatches(competitionId: number): Promise<AdminMatchesResponse> {
  return {
    matches: findAdminMatches(competitionId).map(toMatchResponse)
  };
}

export async function importSchedule(
  competitionId: number,
  input: Partial<AdminActionSecretRequest> | undefined
): Promise<ImportScheduleResult> {
  const secretCodeResult = await validateSecretCode(input);

  if (secretCodeResult.status !== 'valid') {
    return secretCodeResult;
  }

  const competition = findCompetitionForAdmin(competitionId);
  const sourceUrl = competition?.odds_source_url.trim() ?? '';

  if (!isValidSourceUrl(sourceUrl)) {
    return { status: 'invalid' };
  }

  const existingMatches = findAdminMatches(competitionId);
  const importedSchedule = await importOddsPortalSchedule(sourceUrl, existingMatches);
  importTeams(importedSchedule.teams, competitionId);
  applyTeamLogosToMatches(competitionId);
  const imported = importMatches(importedSchedule.matches, competitionId);
  applyTeamLogosToMatches(competitionId);
  await clearCompetitionPendingData(competitionId);

  return {
    status: 'imported',
    response: {
      imported,
      matches: findAdminMatches(competitionId).map(toMatchResponse)
    }
  };
}

async function clearCompetitionPendingData(competitionId: number): Promise<void> {
  const cleanupKey = `${worldCupPendingDataCleanupMetadataKey}:${competitionId}`;
  const cleanupVersion = await getMetadataValue(cleanupKey);

  if (cleanupVersion === worldCupPendingDataCleanupVersion) {
    return;
  }

  const nowIso = new Date().toISOString();
  clearPendingFinalScores(competitionId, nowIso);
  clearPendingPredictions(competitionId, nowIso);
  setMetadataValue(cleanupKey, worldCupPendingDataCleanupVersion);
}

export async function syncOdds(competitionId: number, input: Partial<AdminActionSecretRequest> | undefined): Promise<SyncOddsResult> {
  const secretCodeResult = await validateSecretCode(input);

  if (secretCodeResult.status !== 'valid') {
    return secretCodeResult;
  }

  const competition = findCompetitionForAdmin(competitionId);
  const oddsSourceUrl = competition?.odds_source_url.trim() ?? '';

  if (!isValidSourceUrl(oddsSourceUrl)) {
    return { status: 'invalid' };
  }

  const matches = findAdminMatches(competitionId);
  const importedOdds = await importOddsPortalOdds(oddsSourceUrl);
  const syncPlan = mapImportedOddsToMatches(matches, importedOdds);
  const synced = setMatchOdds(syncPlan.odds);
  const backfilled = backfillPredictionOdds(competitionId);

  return {
    status: 'synced',
    response: {
      synced,
      matched: syncPlan.matched,
      skippedExisting: syncPlan.skippedExisting,
      skippedFinished: syncPlan.skippedFinished,
      skippedUnresolved: syncPlan.skippedUnresolved,
      unmatched: syncPlan.unmatched,
      backfilled,
      matches: findAdminMatches(competitionId).map(toMatchResponse)
    }
  };
}

function isValidSourceUrl(value: string): boolean {
  if (value.length < 1 || value.length > 500) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function validateSecretCode(input: Partial<AdminActionSecretRequest> | undefined): Promise<SecretCodeResult> {
  if (typeof input?.secretCode !== 'string' || input.secretCode.length < 1 || input.secretCode.length > 128) {
    return { status: 'invalid' };
  }

  const superAdmin = await findSuperAdminForSecretCode();

  if (!superAdmin || !verifyPassword(input.secretCode, superAdmin.password_hash)) {
    return { status: 'invalid_secret' };
  }

  return { status: 'valid' };
}

export async function changeFinalScore(
  competitionId: number,
  matchId: number,
  input: Partial<UpdateFinalScoreRequest> | undefined
): Promise<UpdateFinalScoreResult> {
  if (!Number.isInteger(matchId) || matchId < 1) {
    return { status: 'invalid' };
  }

  const bothEmpty = input?.homeScore === null && input.awayScore === null;
  const bothScores = isValidNullableScore(input?.homeScore) && isValidNullableScore(input?.awayScore);

  if (!bothEmpty && (!bothScores || input?.homeScore === null || input.awayScore === null)) {
    return { status: 'invalid' };
  }

  const match = setFinalScore(competitionId, matchId, input.homeScore, input.awayScore);

  if (!match) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    match: toMatchResponse(match)
  };
}

export async function changeKickoff(
  competitionId: number,
  matchId: number,
  input: Partial<UpdateKickoffRequest> | undefined
): Promise<UpdateKickoffResult> {
  if (
    !Number.isInteger(matchId) ||
    matchId < 1 ||
    typeof input?.kickoffAt !== 'string' ||
    !isValidIsoDate(input.kickoffAt) ||
    !isValidVenuePart(input.city, 80) ||
    !isValidVenuePart(input.venue, 120)
  ) {
    return { status: 'invalid' };
  }

  const secretCodeResult = await validateSecretCode(input);

  if (secretCodeResult.status !== 'valid') {
    return secretCodeResult;
  }

  const match = setKickoff(competitionId, matchId, input.kickoffAt, input.city.trim(), input.venue.trim());

  if (!match) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    match: toMatchResponse(match)
  };
}

export async function changePlayoffMapping(
  competitionId: number,
  matchId: number,
  input: Partial<UpdatePlayoffMappingRequest> | undefined
): Promise<UpdatePlayoffMappingResult> {
  if (
    !Number.isInteger(matchId) ||
    matchId < 1 ||
    (input?.side !== 'home' && input?.side !== 'away') ||
    !isValidNullableTeamName(input.teamName) ||
    !isValidNullableTeamFlag(input.teamFlag)
  ) {
    return { status: 'invalid' };
  }

  if (input.teamName === null && input.teamFlag !== null) {
    return { status: 'invalid' };
  }

  const competition = findCompetitionForAdmin(competitionId);

  if (!competition || competition.playoffs_enabled !== 1) {
    return { status: 'invalid' };
  }

  const match = setPlayoffTeamMapping(competitionId, matchId, input.side, input.teamName, input.teamFlag);

  if (!match) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    match: toMatchResponse(match)
  };
}

function toMatchResponse(match: MatchRow): MatchResponse {
  return {
    id: match.id,
    matchNumber: match.match_number,
    stage: match.stage,
    groupName: match.group_name,
    roundLabel: match.round_label,
    predictionRound: getPredictionRound(match),
    predictionDeadlineAt: match.kickoff_at,
    predictionLocked: false,
    kickoffAt: match.kickoff_at,
    sourceTimeZone: match.source_time_zone,
    homeTeam: {
      name: match.home_mapped_team_name ?? match.home_team_name,
      flag: match.home_mapped_team_flag ?? match.home_team_flag,
      placeholderName: match.home_mapped_team_name ? match.home_team_name : null
    },
    awayTeam: {
      name: match.away_mapped_team_name ?? match.away_team_name,
      flag: match.away_mapped_team_flag ?? match.away_team_flag,
      placeholderName: match.away_mapped_team_name ? match.away_team_name : null
    },
    venue: match.venue,
    city: match.city,
    odds:
      match.home_win_odds === null || match.draw_odds === null || match.away_win_odds === null
        ? null
        : {
            homeWin: match.home_win_odds,
            draw: match.draw_odds,
            awayWin: match.away_win_odds,
            syncedAt: match.odds_synced_at
          },
    finalScore:
      match.final_home_score === null || match.final_away_score === null
        ? null
        : {
            home: match.final_home_score,
            away: match.final_away_score
          }
  };
}

function isValidNullableScore(score: unknown): score is number | null {
  return score === null || (typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 99);
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidVenuePart(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= maxLength;
}

function isValidNullableTeamName(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80);
}

function isValidNullableTeamFlag(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= 16);
}

function mapImportedOddsToMatches(matches: readonly MatchRow[], importedOdds: readonly ImportedMatchOdds[]): MatchOddsSyncPlan {
  const matchedOdds: MatchOddsInput[] = [];
  const oddsByTeams = new Map<string, ImportedMatchOdds>();
  let skippedExisting = 0;
  let skippedFinished = 0;
  let skippedUnresolved = 0;
  let unmatched = 0;

  for (const odds of importedOdds) {
    oddsByTeams.set(toTeamKey(odds.homeTeamName, odds.awayTeamName), odds);
  }

  for (const match of matches) {
    if (hasOdds(match)) {
      skippedExisting += 1;
      continue;
    }

    if (isFinished(match)) {
      skippedFinished += 1;
      continue;
    }

    const homeTeamName = getResolvedHomeTeamName(match);
    const awayTeamName = getResolvedAwayTeamName(match);

    if (isUnresolvedTeamSlot(homeTeamName) || isUnresolvedTeamSlot(awayTeamName)) {
      skippedUnresolved += 1;
      continue;
    }

    const odds = oddsByTeams.get(toTeamKey(homeTeamName, awayTeamName));

    if (!odds) {
      unmatched += 1;
      continue;
    }

    matchedOdds.push({
      matchId: match.id,
      homeWinOdds: odds.homeWinOdds,
      drawOdds: odds.drawOdds,
      awayWinOdds: odds.awayWinOdds
    });
  }

  return {
    odds: matchedOdds,
    matched: matchedOdds.length,
    skippedExisting,
    skippedFinished,
    skippedUnresolved,
    unmatched
  };
}

function toTeamKey(homeTeamName: string, awayTeamName: string): string {
  return `${normalizeTeamName(homeTeamName)}|${normalizeTeamName(awayTeamName)}`;
}

function getResolvedHomeTeamName(match: MatchRow): string {
  return match.home_mapped_team_name ?? match.home_team_name;
}

function getResolvedAwayTeamName(match: MatchRow): string {
  return match.away_mapped_team_name ?? match.away_team_name;
}

function hasOdds(match: MatchRow): boolean {
  return match.home_win_odds !== null || match.draw_odds !== null || match.away_win_odds !== null;
}

function isFinished(match: MatchRow): boolean {
  return match.final_home_score !== null && match.final_away_score !== null;
}

function isUnresolvedTeamSlot(teamName: string): boolean {
  const normalized = teamName.trim().toUpperCase();

  return (
    /^([A-L]\s*[1-4]|[1-4]\s*[A-L])$/.test(normalized) ||
    /^[WL]\s*\d{1,3}$/.test(normalized) ||
    /\b(?:WINNER|LOSER)\b/.test(normalized) ||
    /\bGROUP\s+[A-L]\b/.test(normalized)
  );
}

function normalizeTeamName(teamName: string): string {
  const normalized = teamName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();

  return teamNameAliases[normalized] ?? normalized;
}

const teamNameAliases: Record<string, string> = {
  bosniaandherzegovina: 'bosniaherzegovina',
  bosniaherzegovina: 'bosniaherzegovina',
  czechrepublic: 'czechia',
  drcongo: 'drcongo',
  ivorycoast: 'ivorycoast',
  turkiye: 'turkey',
  turkey: 'turkey',
  usa: 'unitedstates',
  unitedstates: 'unitedstates'
};

function getPredictionRound(match: MatchRow): string {
  if (isWeekRoundLabel(match.round_label)) {
    return match.round_label;
  }

  if (match.match_number <= 24) {
    return 'Group stage - Round 1';
  }

  if (match.match_number <= 48) {
    return 'Group stage - Round 2';
  }

  if (match.match_number <= 72) {
    return 'Group stage - Round 3';
  }

  return match.round_label;
}

function isWeekRoundLabel(label: string): boolean {
  return /^Week \d+$/.test(label);
}
