import { MatchRow } from '../../database/queries/matches.queries.js';
import { LeaderboardPredictionRow } from '../../database/queries/leaderboard.queries.js';
import { LeaderboardResponse, LeaderboardRoundResponse, LeaderboardUserResponse } from './leaderboard.interfaces.js';
import { findLeaderboardMatches, findLeaderboardPredictions, findLeaderboardUsers } from './leaderboard.repository.js';

interface RoundSummary {
  readonly label: string;
  readonly expectedCount: number;
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const matches = findLeaderboardMatches();
  const roundSummaries = getRoundSummaries(matches);
  const users = findLeaderboardUsers();
  const predictionsByUser = groupPredictionsByUser(findLeaderboardPredictions());

  return {
    rounds: roundSummaries.map((round) => round.label),
    totalUsers: users.length,
    users: users
      .map<LeaderboardUserResponse>((user) => {
        const userPredictions = predictionsByUser.get(user.id) ?? [];
        const rounds = roundSummaries.map((round) => getUserRoundSummary(round, userPredictions));
        const totalPoints = roundPoints(rounds.reduce((total, round) => total + round.points, 0));

        return {
          id: user.id,
          username: user.username,
          displayName: getDisplayName(user.first_name, user.last_name, user.username),
          totalPoints,
          rounds
        };
      })
      .sort((firstUser, secondUser) => {
        const pointsComparison = secondUser.totalPoints - firstUser.totalPoints;

        if (pointsComparison !== 0) {
          return pointsComparison;
        }

        return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
      })
  };
}

function getRoundSummaries(matches: readonly MatchRow[]): RoundSummary[] {
  const rounds = new Map<string, number>();

  for (const match of matches) {
    const label = getPredictionRound(match);
    rounds.set(label, (rounds.get(label) ?? 0) + 1);
  }

  return Array.from(rounds, ([label, expectedCount]) => ({
    label,
    expectedCount
  }));
}

function getUserRoundSummary(
  round: RoundSummary,
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardRoundResponse {
  const roundPredictions = predictions.filter((prediction) => getPredictionRound(prediction) === round.label);

  return {
    label: round.label,
    submittedCount: roundPredictions.length,
    expectedCount: round.expectedCount,
    points: roundPoints(roundPredictions.reduce((total, prediction) => total + calculatePredictionPoints(prediction), 0))
  };
}

function groupPredictionsByUser(
  predictions: readonly LeaderboardPredictionRow[]
): Map<number, LeaderboardPredictionRow[]> {
  const groups = new Map<number, LeaderboardPredictionRow[]>();

  for (const prediction of predictions) {
    groups.set(prediction.user_id, [...(groups.get(prediction.user_id) ?? []), prediction]);
  }

  return groups;
}

function calculatePredictionPoints(prediction: LeaderboardPredictionRow): number {
  if (prediction.final_home_score === null || prediction.final_away_score === null) {
    return 0;
  }

  const outcomePoints = prediction.prediction_odds_value ?? 0;

  if (
    prediction.prediction_home_score === prediction.final_home_score &&
    prediction.prediction_away_score === prediction.final_away_score
  ) {
    return roundPoints(outcomePoints + 1);
  }

  if (
    getScoreOutcome(prediction.prediction_home_score, prediction.prediction_away_score) ===
    getScoreOutcome(prediction.final_home_score, prediction.final_away_score)
  ) {
    return roundPoints(outcomePoints);
  }

  return 0;
}

function getScoreOutcome(homeScore: number, awayScore: number): '1' | 'X' | '2' {
  if (homeScore > awayScore) {
    return '1';
  }

  if (homeScore < awayScore) {
    return '2';
  }

  return 'X';
}

function getPredictionRound(match: Pick<MatchRow, 'match_number' | 'round_label'>): string {
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

function getDisplayName(firstName: string, lastName: string, username: string): string {
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || username;
}

function roundPoints(points: number): number {
  return Math.round((points + Number.EPSILON) * 100) / 100;
}
