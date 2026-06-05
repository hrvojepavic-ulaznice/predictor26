import { MatchRow } from '../../database/queries/matches.queries.js';
import { MatchResponse } from '../matches/matches.interfaces.js';
import { AdminMatchesResponse, ImportMatchesResponse, UpdateFinalScoreRequest } from './admin-matches.interfaces.js';
import { findAdminMatches, importMatches, setFinalScore } from './admin-matches.repository.js';
import { importWorldCupSchedule } from './world-cup-schedule-importer.js';

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

export async function importSchedule(): Promise<ImportMatchesResponse> {
  const importedMatches = await importWorldCupSchedule();
  const imported = importMatches(importedMatches);

  return {
    imported,
    matches: findAdminMatches().map(toMatchResponse)
  };
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
