import { MatchPrediction, MatchScore } from '@models/match.models';

export type PredictionPointsState = 'pending' | 'miss' | 'outcome' | 'exact';

const predictionPointsStateColors: Readonly<Record<Exclude<PredictionPointsState, 'pending'>, string>> = {
  miss: '#b91c1c',
  outcome: '#ea580c',
  exact: '#166534'
};

export interface PredictionPointsResult {
  readonly earned: number | null;
  readonly available: number;
  readonly outcomePoints: number;
  readonly exactScorePoints: number;
  readonly state: PredictionPointsState;
}

export function getPredictionPointsStateColor(state: PredictionPointsState | null): string | null {
  if (!state || state === 'pending') {
    return null;
  }

  return predictionPointsStateColors[state];
}

export function calculatePredictionPoints(
  prediction: MatchPrediction,
  finalScore: MatchScore | null
): PredictionPointsResult {
  const outcomePoints = prediction.odds?.value ?? 0;
  const exactScorePoints = 1;
  const available = roundPoints(outcomePoints + exactScorePoints);

  if (!finalScore) {
    return {
      earned: null,
      available,
      outcomePoints,
      exactScorePoints,
      state: 'pending'
    };
  }

  if (prediction.home === finalScore.home && prediction.away === finalScore.away) {
    return {
      earned: available,
      available,
      outcomePoints,
      exactScorePoints,
      state: 'exact'
    };
  }

  if (getScoreOutcome(prediction) === getScoreOutcome(finalScore)) {
    return {
      earned: roundPoints(outcomePoints),
      available,
      outcomePoints,
      exactScorePoints,
      state: 'outcome'
    };
  }

  return {
    earned: 0,
    available,
    outcomePoints,
    exactScorePoints,
    state: 'miss'
  };
}

function getScoreOutcome(score: MatchScore): '1' | 'X' | '2' {
  if (score.home > score.away) {
    return '1';
  }

  if (score.home < score.away) {
    return '2';
  }

  return 'X';
}

function roundPoints(points: number): number {
  return Math.round((points + Number.EPSILON) * 100) / 100;
}
