import { listMatches, MatchRow } from '../../database/queries/matches.queries.js';
import {
  MatchesResponse,
  MatchWithPredictionResponse,
  SavePredictionRequest,
  SavePredictionResponse
} from './matches.interfaces.js';
import { findMatchesForUser, savePrediction } from './matches.repository.js';

export type SavePredictionResult =
  | {
      readonly status: 'saved';
      readonly prediction: SavePredictionResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'locked';
    };

export async function getMatchesForUser(userId: number): Promise<MatchesResponse> {
  return {
    matches: withPredictionLockData(findMatchesForUser(userId)).map((match) => ({
      ...toMatchResponse(match),
      prediction:
        match.prediction_home_score === null || match.prediction_away_score === null
          ? null
          : {
              home: match.prediction_home_score,
              away: match.prediction_away_score
            }
    }))
  };
}

export async function submitPrediction(
  userId: number,
  matchId: number,
  input: Partial<SavePredictionRequest> | undefined
): Promise<SavePredictionResult> {
  if (!Number.isInteger(matchId) || matchId < 1 || !isValidScore(input?.homeScore) || !isValidScore(input?.awayScore)) {
    return { status: 'invalid' };
  }

  const match = withPredictionLockData(listMatches()).find((currentMatch) => currentMatch.id === matchId);

  if (!match) {
    return { status: 'not_found' };
  }

  if (match.predictionLocked) {
    return { status: 'locked' };
  }

  const prediction = savePrediction(userId, matchId, input.homeScore, input.awayScore);

  if (!prediction) {
    return { status: 'not_found' };
  }

  return {
    status: 'saved',
    prediction: {
      prediction: {
        home: prediction.home_score,
        away: prediction.away_score
      }
    }
  };
}

function toMatchResponse(match: MatchRowWithLockData): Omit<MatchWithPredictionResponse, 'prediction'> {
  return {
    id: match.id,
    matchNumber: match.match_number,
    stage: match.stage,
    groupName: match.group_name,
    roundLabel: match.round_label,
    predictionRound: match.predictionRound,
    predictionDeadlineAt: match.predictionDeadlineAt,
    predictionLocked: match.predictionLocked,
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

function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 99;
}

function withPredictionLockData<T extends MatchRow>(matches: readonly T[]): Array<T & PredictionLockData> {
  const deadlines = new Map<string, string>();

  for (const match of matches) {
    const predictionRound = getPredictionRound(match);
    const currentDeadline = deadlines.get(predictionRound);

    if (!currentDeadline || Date.parse(match.kickoff_at) < Date.parse(currentDeadline)) {
      deadlines.set(predictionRound, match.kickoff_at);
    }
  }

  return matches.map((match) => {
    const predictionRound = getPredictionRound(match);
    const predictionDeadlineAt = deadlines.get(predictionRound) ?? match.kickoff_at;

    return {
      ...match,
      predictionRound,
      predictionDeadlineAt,
      predictionLocked: Date.now() >= Date.parse(predictionDeadlineAt)
    };
  });
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

interface PredictionLockData {
  readonly predictionRound: string;
  readonly predictionDeadlineAt: string;
  readonly predictionLocked: boolean;
}

type MatchRowWithLockData = MatchRow & PredictionLockData;
