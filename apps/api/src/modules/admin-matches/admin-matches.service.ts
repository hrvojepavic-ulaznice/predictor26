import { MatchOddsInput, MatchRow } from '../../database/queries/matches.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { MatchResponse } from '../matches/matches.interfaces.js';
import {
  AdminActionSecretRequest,
  AdminMatchesResponse,
  ImportMatchesResponse,
  SyncMatchOddsResponse,
  UpdateFinalScoreRequest
} from './admin-matches.interfaces.js';
import {
  backfillPredictionOdds,
  clearPendingFinalScores,
  clearPendingPredictions,
  findAdminMatches,
  findSuperAdminForSecretCode,
  getMetadataValue,
  importMatches,
  pruneMatchesAfter,
  setFinalScore,
  setMetadataValue,
  setMatchOdds
} from './admin-matches.repository.js';
import {
  friendlyInternationalOddsPortalUrl,
  ImportedMatchOdds,
  importOddsPortalOdds,
  worldCupOddsPortalUrl
} from './oddsportal-odds-importer.js';
import { importOddsPortalFriendlySchedule } from './oddsportal-schedule-importer.js';
import { importWorldCupSchedule } from './world-cup-schedule-importer.js';

const useOddsPortalFriendlyTestSource = false;
const oddsPortalSourceUrl = useOddsPortalFriendlyTestSource ? friendlyInternationalOddsPortalUrl : worldCupOddsPortalUrl;
const scheduleSourceMetadataKey = 'admin_matches_schedule_source';
const worldCupPendingDataCleanupMetadataKey = 'admin_matches_world_cup_pending_data_cleanup';
const worldCupPendingDataCleanupVersion = '1';

type ScheduleSource = 'friendly-test' | 'world-cup';

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

export async function getAdminMatches(): Promise<AdminMatchesResponse> {
  return {
    matches: findAdminMatches().map(toMatchResponse)
  };
}

export async function importSchedule(input: Partial<AdminActionSecretRequest> | undefined): Promise<ImportScheduleResult> {
  const secretCodeResult = await validateSecretCode(input);

  if (secretCodeResult.status !== 'valid') {
    return secretCodeResult;
  }

  const scheduleSource = getScheduleSource();
  const importedMatches = useOddsPortalFriendlyTestSource
    ? await importOddsPortalFriendlySchedule()
    : await importWorldCupSchedule();
  const previousScheduleSource = await getMetadataValue(scheduleSourceMetadataKey);

  if (previousScheduleSource && previousScheduleSource !== scheduleSource) {
    pruneMatchesAfter(0);
  }

  const imported = importMatches(importedMatches);
  if (scheduleSource === 'world-cup') {
    await clearWorldCupPendingData();
  }
  setMetadataValue(scheduleSourceMetadataKey, scheduleSource);

  return {
    status: 'imported',
    response: {
      imported,
      matches: findAdminMatches().map(toMatchResponse)
    }
  };
}

function getScheduleSource(): ScheduleSource {
  return useOddsPortalFriendlyTestSource ? 'friendly-test' : 'world-cup';
}

async function clearWorldCupPendingData(): Promise<void> {
  const cleanupVersion = await getMetadataValue(worldCupPendingDataCleanupMetadataKey);

  if (cleanupVersion === worldCupPendingDataCleanupVersion) {
    return;
  }

  const nowIso = new Date().toISOString();
  clearPendingFinalScores(nowIso);
  clearPendingPredictions(nowIso);
  setMetadataValue(worldCupPendingDataCleanupMetadataKey, worldCupPendingDataCleanupVersion);
}

export async function syncOdds(input: Partial<AdminActionSecretRequest> | undefined): Promise<SyncOddsResult> {
  const secretCodeResult = await validateSecretCode(input);

  if (secretCodeResult.status !== 'valid') {
    return secretCodeResult;
  }

  const matches = findAdminMatches();
  const importedOdds = await importOddsPortalOdds(oddsPortalSourceUrl);
  const odds = mapImportedOddsToMatches(matches, importedOdds);
  const synced = setMatchOdds(odds);
  const backfilled = backfillPredictionOdds();

  return {
    status: 'synced',
    response: {
      synced,
      backfilled,
      matches: findAdminMatches().map(toMatchResponse)
    }
  };
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

  const match = setFinalScore(matchId, input.homeScore, input.awayScore);

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
      name: match.home_team_name,
      flag: match.home_team_flag
    },
    awayTeam: {
      name: match.away_team_name,
      flag: match.away_team_flag
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

function mapImportedOddsToMatches(matches: readonly MatchRow[], importedOdds: readonly ImportedMatchOdds[]): MatchOddsInput[] {
  const matchedOdds: MatchOddsInput[] = [];
  const oddsByTeams = new Map<string, ImportedMatchOdds>();

  for (const odds of importedOdds) {
    oddsByTeams.set(toTeamKey(odds.homeTeamName, odds.awayTeamName), odds);
  }

  for (const match of matches) {
    const odds = oddsByTeams.get(toTeamKey(match.home_team_name, match.away_team_name));

    if (!odds) {
      continue;
    }

    matchedOdds.push({
      matchId: match.id,
      homeWinOdds: odds.homeWinOdds,
      drawOdds: odds.drawOdds,
      awayWinOdds: odds.awayWinOdds
    });
  }

  return matchedOdds;
}

function toTeamKey(homeTeamName: string, awayTeamName: string): string {
  return `${normalizeTeamName(homeTeamName)}|${normalizeTeamName(awayTeamName)}`;
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
