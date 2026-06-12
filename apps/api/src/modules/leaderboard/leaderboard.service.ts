import { MatchRow } from '../../database/queries/matches.queries.js';
import { LeaderboardPredictionRow } from '../../database/queries/leaderboard.queries.js';
import {
  LeaderboardComingUpMatchResponse,
  LeaderboardLiveMatchResponse,
  LeaderboardPredictionPointsResponse,
  LeaderboardResponse,
  LeaderboardUserRoundDetailsResponse,
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

const assumedMatchDurationMs = (2 * 60 + 15) * 60 * 1_000;

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const matches = findLeaderboardMatches();
  const roundSummaries = getRoundSummaries(matches);
  const liveMatches = getLiveMatches(matches);
  const comingUpMatches = getComingUpMatches(roundSummaries);
  const users = findLeaderboardUsers();
  const predictionsByUser = groupPredictionsByUser(findLeaderboardPredictions());

  return {
    rounds: roundSummaries.map((round) => ({
      label: round.label,
      locked: round.locked,
      viewable: round.viewable
    })),
    liveMatches: liveMatches.map(toLiveMatchResponse),
    comingUpMatches: comingUpMatches.map(toComingUpMatchResponse),
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
          livePredictions: getUserLivePredictions(liveMatches, userPredictions),
          comingUpPredictions: getUserComingUpPredictions(comingUpMatches, userPredictions),
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

function getLiveMatches(matches: readonly MatchRow[]): MatchRow[] {
  const now = Date.now();

  return matches.filter((match) => Date.parse(match.kickoff_at) <= now && !isSettledForLiveLeaderboard(match, now)).sort(sortMatchesByKickoff);
}

function getComingUpMatches(rounds: readonly RoundSummary[]): MatchRow[] {
  const now = Date.now();
  const eligibleMatches = rounds
    .filter((round) => round.locked)
    .flatMap((round) => round.matches)
    .filter((match) => Date.parse(match.kickoff_at) > now);

  const nextKickoffAt = eligibleMatches.reduce<string | null>((nextKickoff, match) => {
    if (!nextKickoff || Date.parse(match.kickoff_at) < Date.parse(nextKickoff)) {
      return match.kickoff_at;
    }

    return nextKickoff;
  }, null);

  return nextKickoffAt === null
    ? []
    : eligibleMatches.filter((match) => match.kickoff_at === nextKickoffAt).sort(sortMatchesByKickoff);
}

function isSettledForLiveLeaderboard(match: MatchRow, now: number): boolean {
  return (
    match.final_home_score !== null &&
    match.final_away_score !== null &&
    now - Date.parse(match.kickoff_at) >= assumedMatchDurationMs
  );
}

function toLiveMatchResponse(match: MatchRow): LeaderboardLiveMatchResponse {
  return {
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
    }
  };
}

function toComingUpMatchResponse(match: MatchRow): LeaderboardComingUpMatchResponse {
  return {
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
    }
  };
}

function getUserLivePredictions(
  liveMatches: readonly MatchRow[],
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardUserResponse['livePredictions'] {
  const predictionsByMatchId = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));

  return liveMatches.map((match) => ({
    matchId: match.id,
    prediction: predictionsByMatchId.has(match.id) ? toPredictionResponse(predictionsByMatchId.get(match.id)!) : null
  }));
}

function getUserComingUpPredictions(
  comingUpMatches: readonly MatchRow[],
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardUserResponse['comingUpPredictions'] {
  const predictionsByMatchId = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));

  return comingUpMatches.map((match) => ({
    matchId: match.id,
    prediction: predictionsByMatchId.has(match.id) ? toPredictionResponse(predictionsByMatchId.get(match.id)!) : null
  }));
}

export async function getLeaderboardUserRoundDetails(
  userId: number,
  roundLabel: string,
  viewerUserId: number | null
): Promise<LeaderboardUserRoundDetailsResponse | null> {
  if (!Number.isInteger(userId) || userId < 1 || !roundLabel) {
    return null;
  }

  const round = getRoundSummaries(findLeaderboardMatches()).find((currentRound) => currentRound.label === roundLabel);

  if (!round?.viewable || viewerUserId === null) {
    return null;
  }

  const user = findLeaderboardUsers().find((currentUser) => currentUser.id === userId);

  if (!user) {
    return null;
  }

  const predictions = findLeaderboardPredictions().filter((prediction) => prediction.user_id === userId);
  const roundPredictions = predictions.filter((prediction) => getPredictionRound(prediction) === round.label);
  const roundMatches = getLeaderboardRoundMatches(round, roundPredictions);

  return {
    round: {
      ...getUserRoundSummary(round, predictions),
      matches: getRoundMatchesForVisibility(round, roundPredictions, roundMatches, user.id === viewerUserId)
    }
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
    viewable: round.viewable
  };
}

function getRoundMatchesForVisibility(
  round: RoundSummary,
  predictions: readonly LeaderboardPredictionRow[],
  roundMatches: readonly LeaderboardRoundMatchResponse[],
  isViewerUser: boolean
): LeaderboardRoundMatchResponse[] {
  if (round.locked) {
    return [...roundMatches];
  }

  if (!round.viewable) {
    return [];
  }

  return isViewerUser ? getViewerOpenRoundMatches(round, predictions) : getHiddenLeaderboardRoundMatches(round);
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
    predictionHidden: true,
    finalScore: null,
    points: {
      earned: null,
      available: null,
      state: 'pending'
    }
  }));
}

function getViewerOpenRoundMatches(
  round: RoundSummary,
  predictions: readonly LeaderboardPredictionRow[]
): LeaderboardRoundMatchResponse[] {
  const predictionsByMatchId = new Map(predictions.map((prediction) => [prediction.match_id, prediction]));

  return round.matches.map((match) => {
    const prediction = predictionsByMatchId.get(match.id);

    return {
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
      prediction: prediction ? toPredictionResponse(prediction) : null,
      predictionHidden: false,
      finalScore: null,
      points: prediction
        ? calculatePredictionPoints(prediction)
        : {
            earned: null,
            available: null,
            state: 'pending'
          }
    };
  });
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
      prediction: toPredictionResponse(prediction),
      predictionHidden: false,
      finalScore,
      points: calculatePredictionPoints(prediction)
    });
  }

  return matches;
}

function toPredictionResponse(prediction: LeaderboardPredictionRow): LeaderboardRoundMatchResponse['prediction'] {
  return {
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

function sortMatchesByKickoff(firstMatch: MatchRow, secondMatch: MatchRow): number {
  const kickoffComparison = Date.parse(firstMatch.kickoff_at) - Date.parse(secondMatch.kickoff_at);

  if (kickoffComparison !== 0) {
    return kickoffComparison;
  }

  return firstMatch.match_number - secondMatch.match_number;
}
