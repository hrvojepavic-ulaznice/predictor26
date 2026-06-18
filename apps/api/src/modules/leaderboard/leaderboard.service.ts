import { MatchRow } from '../../database/queries/matches.queries.js';
import { LeaderboardPredictionRow } from '../../database/queries/leaderboard.queries.js';
import { LatestLiveScoreSnapshotRow } from '../../database/queries/live-scores.queries.js';
import {
  LeaderboardComingUpMatchResponse,
  LeaderboardLiveMatchResponse,
  LeaderboardPredictionPointsResponse,
  LeaderboardMatchDayResponse,
  LeaderboardMatchPredictionsResponse,
  LeaderboardStatsBiggestOddsWinResponse,
  LeaderboardStatsExactScoreLeaderResponse,
  LeaderboardStatsOutcomeLeaderResponse,
  LeaderboardStatsResponse,
  LeaderboardStatsUserRankResponse,
  LeaderboardMatchStatusResponse,
  LeaderboardResponse,
  LeaderboardUserRoundDetailsResponse,
  LeaderboardRoundMatchResponse,
  LeaderboardRoundResponse,
  LeaderboardUserResponse
} from './leaderboard.interfaces.js';
import { findLeaderboardMatches, findLeaderboardPredictions, findLeaderboardUsers } from './leaderboard.repository.js';
import { findLatestLiveScoreSnapshots } from '../live-scores/live-scores.repository.js';

interface RoundSummary {
  readonly label: string;
  readonly expectedCount: number;
  readonly locked: boolean;
  readonly viewable: boolean;
  readonly matches: MatchRow[];
}

const assumedMatchDurationMs = (2 * 60 + 15) * 60 * 1_000;
const matchDayTimeZone = 'Europe/Zagreb';

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const matches = findLeaderboardMatches();
  const winnerTeamsByName = getWinnerTeamsByName(matches);
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));
  const roundSummaries = getRoundSummaries(matches);
  const leaderboardRoundSummaries = orderLeaderboardRounds(roundSummaries);
  const liveMatches = getLiveMatches(matches, latestSnapshotsByMatchId);
  const comingUpMatches = getComingUpMatches(roundSummaries, liveMatches);
  const users = findLeaderboardUsers();
  const predictionsByUser = groupPredictionsByUser(findLeaderboardPredictions());
  const liveMatchIds = new Set(liveMatches.map((match) => match.id));
  const leaderboardUsers = users.map<LeaderboardUserResponse>((user) => {
    const userPredictions = predictionsByUser.get(user.id) ?? [];
    const rounds = leaderboardRoundSummaries.map((round) => getUserRoundSummary(round, userPredictions));
    const totalPoints = roundPoints(rounds.reduce((total, round) => total + round.points, 0));
    const winnerTeamName = normalizeWinnerTeamName(user.tiebreaker_name);

    return {
      id: user.id,
      username: user.username,
      winnerTeam: winnerTeamName ? winnerTeamsByName.get(toTeamLookupKey(winnerTeamName)) ?? {
        name: winnerTeamName,
        flag: null,
        placeholderName: null
      } : null,
      totalPoints,
      liveRankMovement: 0,
      livePredictions: getUserLivePredictions(liveMatches, userPredictions),
      comingUpPredictions: getUserComingUpPredictions(comingUpMatches, userPredictions),
      rounds
    };
  });
  const baselinePositionByUserId = positionUsers(
    leaderboardUsers.map((user) => ({
      userId: user.id,
      username: user.username,
      points: getBaselineTotalPoints(user.totalPoints, predictionsByUser.get(user.id) ?? [], liveMatchIds)
    }))
  );
  const currentPositionByUserId = positionUsers(
    leaderboardUsers.map((user) => ({
      userId: user.id,
      username: user.username,
      points: user.totalPoints
    }))
  );

  return {
    rounds: leaderboardRoundSummaries.map((round) => ({
      label: round.label,
      locked: round.locked,
      viewable: round.viewable
    })),
    liveMatches: liveMatches.map(toLiveMatchResponse),
    comingUpMatches: comingUpMatches.map(toComingUpMatchResponse),
    totalUsers: users.length,
    users: leaderboardUsers
      .map((user) => ({
        ...user,
        liveRankMovement: liveMatches.length === 0 ? 0 : (baselinePositionByUserId.get(user.id) ?? 0) - (currentPositionByUserId.get(user.id) ?? 0)
      }))
      .sort((firstUser, secondUser) => {
        const pointsComparison = secondUser.totalPoints - firstUser.totalPoints;

        if (pointsComparison !== 0) {
          return pointsComparison;
        }

        return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
      })
  };
}

export async function getLeaderboardMatchDays(): Promise<LeaderboardMatchDayResponse[]> {
  const days = new Map<string, MatchRow[]>();
  const matches = findLeaderboardMatches();
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));
  const roundLockedByLabel = new Map(getRoundSummaries(matches).map((round) => [round.label, round.locked]));

  for (const match of matches.sort(sortMatchesByKickoff)) {
    const dateKey = getLocalDateKey(match.kickoff_at);
    days.set(dateKey, [...(days.get(dateKey) ?? []), match]);
  }

  return Array.from(days, ([date, matches]) => ({
    date,
    matches: matches.map((match) =>
      toDayMatchResponse(match, roundLockedByLabel.get(getPredictionRound(match)) ?? false, latestSnapshotsByMatchId.get(match.id))
    )
  }));
}

export async function getLeaderboardStats(): Promise<LeaderboardStatsResponse> {
  const matches = findLeaderboardMatches();
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));
  const usersById = new Map(findLeaderboardUsers().map((user) => [user.id, user]));
  const predictions = findLeaderboardPredictions().filter(isPredictionSettled);
  const groupStats = new Map<string, Map<number, LeaderboardStatsUserRankResponse>>();
  const exactScoresByUserId = new Map<number, LeaderboardStatsExactScoreLeaderResponse>();
  const outcomesByUserId = new Map<number, LeaderboardStatsOutcomeLeaderResponse>();
  let biggestOddsWin: LeaderboardStatsBiggestOddsWinResponse | null = null;

  for (const prediction of predictions) {
    const user = usersById.get(prediction.user_id);
    const match = matchesById.get(prediction.match_id);

    if (
      !user ||
      !match ||
      match.final_home_score === null ||
      match.final_away_score === null ||
      getMatchStatus(match, latestSnapshotsByMatchId.get(match.id)) !== 'finished'
    ) {
      continue;
    }

    const points = calculatePredictionPoints(prediction);
    const earnedPoints = points.earned ?? 0;
    const exactScore = points.state === 'exact';
    const correctOutcome = points.state === 'outcome' || points.state === 'exact';

    if (prediction.group_name && (earnedPoints > 0 || correctOutcome)) {
      const statsByUserId = getOrCreateGroupStats(groupStats, prediction.group_name);
      const currentStats = statsByUserId.get(user.id) ?? createStatsUserRank(user.id, user.username);

      statsByUserId.set(user.id, {
        ...currentStats,
        points: roundPoints(currentStats.points + earnedPoints),
        exactScores: currentStats.exactScores + (exactScore ? 1 : 0),
        correctOutcomes: currentStats.correctOutcomes + (correctOutcome ? 1 : 0)
      });
    }

    if (exactScore) {
      const currentLeader = exactScoresByUserId.get(user.id) ?? {
        userId: user.id,
        username: user.username,
        exactScores: 0,
        matches: []
      };

      exactScoresByUserId.set(user.id, {
        ...currentLeader,
        exactScores: currentLeader.exactScores + 1,
        matches: [
          ...currentLeader.matches,
          {
            matchNumber: match.match_number,
            homeTeam: toHomeTeamResponse(match),
            awayTeam: toAwayTeamResponse(match),
            finalScore: {
              home: match.final_home_score,
              away: match.final_away_score
            }
          }
        ]
      });
    }

    if (correctOutcome) {
      const currentLeader = outcomesByUserId.get(user.id) ?? {
        userId: user.id,
        username: user.username,
        correctOutcomes: 0,
        matches: []
      };

      outcomesByUserId.set(user.id, {
        ...currentLeader,
        correctOutcomes: currentLeader.correctOutcomes + 1,
        matches: prediction.prediction_odds_outcome
          ? [
              ...currentLeader.matches,
              {
                matchNumber: match.match_number,
                homeTeam: toHomeTeamResponse(match),
                awayTeam: toAwayTeamResponse(match),
                outcome: prediction.prediction_odds_outcome
              }
            ]
          : currentLeader.matches
      });

      const odds = prediction.prediction_odds_value;

      if (odds !== null && prediction.prediction_odds_outcome !== null) {
        const oddsWin: LeaderboardStatsBiggestOddsWinResponse = {
          userId: user.id,
          username: user.username,
          odds,
          outcome: prediction.prediction_odds_outcome,
          matchNumber: match.match_number,
          homeTeam: toHomeTeamResponse(match),
          awayTeam: toAwayTeamResponse(match)
        };

        if (!biggestOddsWin || sortBiggestOddsWins(oddsWin, biggestOddsWin) < 0) {
          biggestOddsWin = oddsWin;
        }
      }
    }
  }

  return {
    groupLeaders: Array.from(groupStats, ([groupName, statsByUserId]) => ({
      groupName,
      leaders: Array.from(statsByUserId.values()).sort(sortStatsUserRanks).slice(0, 5)
    })).sort((firstGroup, secondGroup) => firstGroup.groupName.localeCompare(secondGroup.groupName, undefined, { sensitivity: 'base' })),
    exactScoreLeaders: Array.from(exactScoresByUserId.values())
      .map((leader) => ({
        ...leader,
        matches: [...leader.matches].sort((firstMatch, secondMatch) => firstMatch.matchNumber - secondMatch.matchNumber)
      }))
      .sort(sortExactScoreLeaders)
      .slice(0, 5),
    outcomeLeaders: Array.from(outcomesByUserId.values())
      .map((leader) => ({
        ...leader,
        matches: [...leader.matches].sort((firstMatch, secondMatch) => firstMatch.matchNumber - secondMatch.matchNumber)
      }))
      .sort(sortOutcomeLeaders)
      .slice(0, 5),
    biggestOddsWin
  };
}

export async function getLeaderboardMatchPredictions(
  matchId: number,
  viewerUserId: number | null
): Promise<LeaderboardMatchPredictionsResponse | null> {
  if (!Number.isInteger(matchId) || matchId < 1 || viewerUserId === null) {
    return null;
  }

  const matches = findLeaderboardMatches();
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));
  const match = matches.find((currentMatch) => currentMatch.id === matchId);

  if (!match) {
    return null;
  }

  const round = getRoundSummaries(matches).find((currentRound) => currentRound.label === getPredictionRound(match));

  if (!round?.viewable) {
    return null;
  }

  const locked = round.locked;
  const predictionsByUserId = new Map(
    findLeaderboardPredictions()
      .filter((prediction) => prediction.match_id === match.id)
      .map((prediction) => [prediction.user_id, prediction])
  );

  return {
    match: toDayMatchResponse(match, locked, latestSnapshotsByMatchId.get(match.id)),
    locked,
    users: findLeaderboardUsers()
      .map((user) => {
        const prediction = predictionsByUserId.get(user.id);
        const predictionHidden = !locked && user.id !== viewerUserId && prediction !== undefined;

        return {
          userId: user.id,
          username: user.username,
          prediction: prediction && !predictionHidden ? toPredictionResponse(prediction) : null,
          predictionHidden,
          points: prediction && (locked || user.id === viewerUserId) ? calculatePredictionPoints(prediction) : hiddenPredictionPoints()
        };
      })
      .sort(sortMatchPredictionUsers)
  };
}

function getLiveMatches(
  matches: readonly MatchRow[],
  latestSnapshotsByMatchId: ReadonlyMap<number, LatestLiveScoreSnapshotRow>
): MatchRow[] {
  const now = Date.now();

  return matches
    .filter((match) => Date.parse(match.kickoff_at) <= now && !isSettledForLiveLeaderboard(match, now, latestSnapshotsByMatchId.get(match.id)))
    .sort(sortMatchesByKickoff);
}

function getComingUpMatches(rounds: readonly RoundSummary[], liveMatches: readonly MatchRow[]): MatchRow[] {
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

  if (nextKickoffAt === null || shouldHideComingUpMatches(nextKickoffAt, liveMatches)) {
    return [];
  }

  return eligibleMatches.filter((match) => match.kickoff_at === nextKickoffAt).sort(sortMatchesByKickoff);
}

function isSettledForLiveLeaderboard(match: MatchRow, now: number, snapshot: LatestLiveScoreSnapshotRow | undefined): boolean {
  if (isFinishedByProvider(snapshot)) {
    return true;
  }

  return (
    match.final_home_score !== null &&
    match.final_away_score !== null &&
    now - Date.parse(match.kickoff_at) >= assumedMatchDurationMs
  );
}

function shouldHideComingUpMatches(nextKickoffAt: string, liveMatches: readonly MatchRow[]): boolean {
  if (liveMatches.length === 0) {
    return false;
  }

  const nextKickoffTime = Date.parse(nextKickoffAt);
  const latestLiveWindowEnd = Math.max(
    ...liveMatches.map((match) => Date.parse(match.kickoff_at) + assumedMatchDurationMs)
  );

  return nextKickoffTime > latestLiveWindowEnd;
}

function toLiveMatchResponse(match: MatchRow): LeaderboardLiveMatchResponse {
  return {
    matchId: match.id,
    matchNumber: match.match_number,
    kickoffAt: match.kickoff_at,
    homeTeam: toHomeTeamResponse(match),
    awayTeam: toAwayTeamResponse(match),
    finalScore:
      match.final_home_score === null || match.final_away_score === null
        ? null
        : {
            home: match.final_home_score,
            away: match.final_away_score
          }
  };
}

function toComingUpMatchResponse(match: MatchRow): LeaderboardComingUpMatchResponse {
  return {
    matchId: match.id,
    matchNumber: match.match_number,
    kickoffAt: match.kickoff_at,
    homeTeam: toHomeTeamResponse(match),
    awayTeam: toAwayTeamResponse(match)
  };
}

function toDayMatchResponse(match: MatchRow, roundLocked: boolean, snapshot: LatestLiveScoreSnapshotRow | undefined) {
  return {
    matchId: match.id,
    matchNumber: match.match_number,
    kickoffAt: match.kickoff_at,
    status: getMatchStatus(match, snapshot),
    roundLocked,
    homeTeam: toHomeTeamResponse(match),
    awayTeam: toAwayTeamResponse(match),
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

function toHomeTeamResponse(match: MatchRow) {
  return {
    name: match.home_mapped_team_name ?? match.home_team_name,
    flag: match.home_mapped_team_flag ?? match.home_team_flag,
    placeholderName: null
  };
}

function toAwayTeamResponse(match: MatchRow) {
  return {
    name: match.away_mapped_team_name ?? match.away_team_name,
    flag: match.away_mapped_team_flag ?? match.away_team_flag,
    placeholderName: null
  };
}

function getWinnerTeamsByName(matches: readonly MatchRow[]): Map<string, ReturnType<typeof toHomeTeamResponse>> {
  const teams = new Map<string, ReturnType<typeof toHomeTeamResponse>>();

  for (const match of matches) {
    const homeTeam = toHomeTeamResponse(match);
    const awayTeam = toAwayTeamResponse(match);

    teams.set(toTeamLookupKey(homeTeam.name), homeTeam);
    teams.set(toTeamLookupKey(awayTeam.name), awayTeam);

    if (match.home_team_name && match.home_team_flag) {
      teams.set(toTeamLookupKey(match.home_team_name), {
        name: match.home_team_name,
        flag: match.home_team_flag,
        placeholderName: null
      });
    }

    if (match.away_team_name && match.away_team_flag) {
      teams.set(toTeamLookupKey(match.away_team_name), {
        name: match.away_team_name,
        flag: match.away_team_flag,
        placeholderName: null
      });
    }
  }

  return teams;
}

function toTeamLookupKey(teamName: string): string {
  return teamName.trim().toLocaleLowerCase();
}

function normalizeWinnerTeamName(teamName: string | null): string | null {
  const normalizedTeamName = teamName?.trim();

  return normalizedTeamName ? normalizedTeamName : null;
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
    matches: [...roundMatches].sort(sortMatchesByKickoff)
  }));
  const firstUnlockedIndex = roundSummaries.findIndex((round) => !round.locked);

  return roundSummaries.map((round, index) => ({
    ...round,
    viewable: round.locked || index === firstUnlockedIndex
  }));
}

function orderLeaderboardRounds(rounds: readonly RoundSummary[]): RoundSummary[] {
  const focusedRoundIndex = findFocusedRoundIndex(rounds);

  if (focusedRoundIndex <= 0) {
    return [...rounds];
  }

  return [...rounds.slice(focusedRoundIndex), ...rounds.slice(0, focusedRoundIndex)];
}

function findFocusedRoundIndex(rounds: readonly RoundSummary[]): number {
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].locked) {
      return index;
    }
  }

  return rounds.findIndex((round) => round.viewable);
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
    homeTeam: toHomeTeamResponse(match),
    awayTeam: toAwayTeamResponse(match),
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
      homeTeam: toHomeTeamResponse(match),
      awayTeam: toAwayTeamResponse(match),
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
      homeTeam: toHomeTeamResponse(match),
      awayTeam: toAwayTeamResponse(match),
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

function getBaselineTotalPoints(
  currentTotalPoints: number,
  predictions: readonly LeaderboardPredictionRow[],
  liveMatchIds: ReadonlySet<number>
): number {
  const livePoints = predictions
    .filter((prediction) => liveMatchIds.has(prediction.match_id))
    .reduce((total, prediction) => total + (calculatePredictionPoints(prediction).earned ?? 0), 0);

  return roundPoints(currentTotalPoints - livePoints);
}

function positionUsers(users: ReadonlyArray<{ readonly userId: number; readonly username: string; readonly points: number }>): Map<number, number> {
  const positions = new Map<number, number>();

  [...users].sort((firstUser, secondUser) => {
    const pointsComparison = secondUser.points - firstUser.points;

    if (pointsComparison !== 0) {
      return pointsComparison;
    }

    return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
  }).forEach((user, index) => {
    positions.set(user.userId, index + 1);
  });

  return positions;
}

function getOrCreateGroupStats(
  groupStats: Map<string, Map<number, LeaderboardStatsUserRankResponse>>,
  groupName: string
): Map<number, LeaderboardStatsUserRankResponse> {
  const currentGroupStats = groupStats.get(groupName);

  if (currentGroupStats) {
    return currentGroupStats;
  }

  const nextGroupStats = new Map<number, LeaderboardStatsUserRankResponse>();

  groupStats.set(groupName, nextGroupStats);

  return nextGroupStats;
}

function createStatsUserRank(userId: number, username: string): LeaderboardStatsUserRankResponse {
  return {
    userId,
    username,
    points: 0,
    exactScores: 0,
    correctOutcomes: 0
  };
}

function sortStatsUserRanks(firstUser: LeaderboardStatsUserRankResponse, secondUser: LeaderboardStatsUserRankResponse): number {
  const pointsComparison = secondUser.points - firstUser.points;

  if (pointsComparison !== 0) {
    return pointsComparison;
  }

  const exactScoreComparison = secondUser.exactScores - firstUser.exactScores;

  if (exactScoreComparison !== 0) {
    return exactScoreComparison;
  }

  return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
}

function sortExactScoreLeaders(
  firstUser: LeaderboardStatsExactScoreLeaderResponse,
  secondUser: LeaderboardStatsExactScoreLeaderResponse
): number {
  const exactScoreComparison = secondUser.exactScores - firstUser.exactScores;

  if (exactScoreComparison !== 0) {
    return exactScoreComparison;
  }

  return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
}

function sortOutcomeLeaders(
  firstUser: LeaderboardStatsOutcomeLeaderResponse,
  secondUser: LeaderboardStatsOutcomeLeaderResponse
): number {
  const outcomeComparison = secondUser.correctOutcomes - firstUser.correctOutcomes;

  if (outcomeComparison !== 0) {
    return outcomeComparison;
  }

  return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
}

function sortBiggestOddsWins(
  firstWin: LeaderboardStatsBiggestOddsWinResponse,
  secondWin: LeaderboardStatsBiggestOddsWinResponse
): number {
  const oddsComparison = secondWin.odds - firstWin.odds;

  if (oddsComparison !== 0) {
    return oddsComparison;
  }

  const matchComparison = firstWin.matchNumber - secondWin.matchNumber;

  return matchComparison !== 0
    ? matchComparison
    : firstWin.username.localeCompare(secondWin.username, undefined, { sensitivity: 'base' });
}

function isPredictionSettled(
  prediction: LeaderboardPredictionRow
): prediction is LeaderboardPredictionRow & { readonly final_home_score: number; readonly final_away_score: number } {
  return prediction.final_home_score !== null && prediction.final_away_score !== null;
}

function sortMatchPredictionUsers(
  firstUser: LeaderboardMatchPredictionsResponse['users'][number],
  secondUser: LeaderboardMatchPredictionsResponse['users'][number]
): number {
  const pointsComparison = getSortableMatchPoints(secondUser) - getSortableMatchPoints(firstUser);

  if (pointsComparison !== 0) {
    return pointsComparison;
  }

  return firstUser.username.localeCompare(secondUser.username, undefined, { sensitivity: 'base' });
}

function getSortableMatchPoints(user: LeaderboardMatchPredictionsResponse['users'][number]): number {
  return user.points.earned ?? Number.NEGATIVE_INFINITY;
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

function hiddenPredictionPoints(): LeaderboardPredictionPointsResponse {
  return {
    earned: null,
    available: null,
    state: 'pending'
  };
}

function getMatchStatus(match: MatchRow, snapshot: LatestLiveScoreSnapshotRow | undefined): LeaderboardMatchStatusResponse {
  const now = Date.now();
  const kickoffTime = Date.parse(match.kickoff_at);
  const elapsed = now - kickoffTime;
  const hasFinalScore = match.final_home_score !== null && match.final_away_score !== null;

  if ((hasFinalScore && elapsed >= assumedMatchDurationMs) || isFinishedByProvider(snapshot)) {
    return 'finished';
  }

  if (kickoffTime <= now && elapsed < assumedMatchDurationMs) {
    return 'live';
  }

  if (kickoffTime <= now && !hasFinalScore) {
    return 'undecided';
  }

  return 'coming_up';
}

function isFinishedByProvider(snapshot: LatestLiveScoreSnapshotRow | undefined): boolean {
  return snapshot?.status === 'finished' && snapshot.home_score !== null && snapshot.away_score !== null;
}

function getLocalDateKey(kickoffAt: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: matchDayTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(kickoffAt));

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
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
