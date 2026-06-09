import { MatchRow } from '../../database/queries/matches.queries.js';
import { LeaderboardPredictionRow } from '../../database/queries/leaderboard.queries.js';
import {
  LeaderboardPredictionPointsResponse,
  LeaderboardResponse,
  LeaderboardRoundMatchResponse,
  LeaderboardRoundResponse,
  LeaderboardUserResponse
} from './leaderboard.interfaces.js';
import { findLeaderboardMatches, findLeaderboardPredictions, findLeaderboardUsers } from './leaderboard.repository.js';

interface RoundSummary {
  readonly label: string;
  readonly expectedCount: number;
  readonly locked: boolean;
  readonly viewable: boolean;
  readonly matches: MatchRow[];
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const matches = findLeaderboardMatches();
  const roundSummaries = getRoundSummaries(matches);
  const users = findLeaderboardUsers();
  const predictionsByUser = groupPredictionsByUser(findLeaderboardPredictions());

  return {
    rounds: roundSummaries.map((round) => ({
      label: round.label,
      locked: round.locked,
      viewable: round.viewable
    })),
    totalUsers: users.length,
    users: users
      .map<LeaderboardUserResponse>((user) => {
        const userPredictions = predictionsByUser.get(user.id) ?? [];
        const rounds = roundSummaries.map((round) => getUserRoundSummary(round, userPredictions));
        const totalPoints = roundPoints(rounds.reduce((total, round) => total + round.points, 0));

        return {
          id: user.id,
          username: user.username,
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
  const rounds = new Map<string, MatchRow[]>();

  for (const match of matches) {
    const label = getPredictionRound(match);
    rounds.set(label, [...(rounds.get(label) ?? []), match]);
  }

  const roundSummaries = Array.from(rounds, ([label, roundMatches]) => ({
    label,
    expectedCount: roundMatches.length,
    locked: isRoundLocked(roundMatches),
    matches: roundMatches
  }));
  const firstUnlockedIndex = roundSummaries.findIndex((round) => !round.locked);

  return roundSummaries.map((round, index) => ({
    ...round,
    viewable: round.locked || index === firstUnlockedIndex
  }));
}

function getUserRoundSummary(
  round: RoundSummary,
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardRoundResponse {
  const roundPredictions = predictions.filter((prediction) => getPredictionRound(prediction) === round.label);
  const roundMatches = getLeaderboardRoundMatches(round, roundPredictions);

  return {
    label: round.label,
    submittedCount: roundPredictions.length,
    expectedCount: round.expectedCount,
    points: roundPoints(roundMatches.reduce((total, match) => total + (match.points.earned ?? 0), 0)),
    locked: round.locked,
    viewable: round.viewable,
    matches: round.locked ? roundMatches : round.viewable ? getHiddenLeaderboardRoundMatches(round) : []
  };
}

function getHiddenLeaderboardRoundMatches(round: RoundSummary): LeaderboardRoundMatchResponse[] {
  return round.matches.map((match) => ({
    matchId: match.id,
    matchNumber: match.match_number,
    kickoffAt: match.kickoff_at,
    homeTeam: {
      name: match.home_team_name,
      flag: match.home_team_flag
    },
    awayTeam: {
      name: match.away_team_name,
      flag: match.away_team_flag
    },
    prediction: null,
    finalScore: null,
    points: {
      earned: null,
      available: null,
      state: 'pending'
    }
  }));
}

function getLeaderboardRoundMatches(
  round: RoundSummary,
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardRoundMatchResponse[] {
  const predictionsByMatchId = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));
  const matches: LeaderboardRoundMatchResponse[] = [];

  for (const match of round.matches) {
    const prediction = predictionsByMatchId.get(match.id);

    if (!prediction) {
      continue;
    }

    const finalScore =
      match.final_home_score === null || match.final_away_score === null
        ? null
        : {
            home: match.final_home_score,
            away: match.final_away_score
          };

    matches.push({
      matchId: match.id,
      matchNumber: match.match_number,
      kickoffAt: match.kickoff_at,
      homeTeam: {
        name: match.home_team_name,
        flag: match.home_team_flag
      },
      awayTeam: {
        name: match.away_team_name,
        flag: match.away_team_flag
      },
      prediction: {
        home: prediction.prediction_home_score,
        away: prediction.prediction_away_score,
        odds:
          prediction.prediction_odds_outcome === null || prediction.prediction_odds_value === null
            ? null
            : {
                outcome: prediction.prediction_odds_outcome,
                value: prediction.prediction_odds_value,
                syncedAt: null
              }
      },
      finalScore,
      points: calculatePredictionPoints(prediction)
    });
  }

  return matches;
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

function calculatePredictionPoints(prediction: LeaderboardPredictionRow): LeaderboardPredictionPointsResponse {
  const outcomePoints = prediction.prediction_odds_value ?? 0;
  const available = roundPoints(outcomePoints + 1);

  if (prediction.final_home_score === null || prediction.final_away_score === null) {
    return {
      earned: null,
      available,
      state: 'pending'
    };
  }

  if (
    prediction.prediction_home_score === prediction.final_home_score &&
    prediction.prediction_away_score === prediction.final_away_score
  ) {
    return {
      earned: available,
      available,
      state: 'exact'
    };
  }

  if (
    getScoreOutcome(prediction.prediction_home_score, prediction.prediction_away_score) ===
    getScoreOutcome(prediction.final_home_score, prediction.final_away_score)
  ) {
    return {
      earned: roundPoints(outcomePoints),
      available,
      state: 'outcome'
    };
  }

  return {
    earned: 0,
    available,
    state: 'miss'
  };
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

function isRoundLocked(matches: readonly MatchRow[]): boolean {
  const deadline = matches.reduce<string | null>((currentDeadline, match) => {
    if (!currentDeadline || Date.parse(match.kickoff_at) < Date.parse(currentDeadline)) {
      return match.kickoff_at;
    }

    return currentDeadline;
  }, null);

  return deadline !== null && Date.now() >= Date.parse(deadline);
}

function roundPoints(points: number): number {
  return Math.round((points + Number.EPSILON) * 100) / 100;
}
