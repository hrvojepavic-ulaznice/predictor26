import { MatchRow } from '../../database/queries/matches.queries.js';
import { LeaderboardPredictionRow } from '../../database/queries/leaderboard.queries.js';
import { LatestLiveScoreSnapshotRow } from '../../database/queries/live-scores.queries.js';
import {
  LeaderboardComingUpMatchResponse,
  LeaderboardLiveMatchResponse,
  LeaderboardPredictionPointsResponse,
  LeaderboardMatchDayResponse,
  LeaderboardMatchPredictionsResponse,
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
  const latestSnapshotsByMatchId = new Map(findLatestLiveScoreSnapshots().map((snapshot) => [snapshot.match_id, snapshot]));
  const roundSummaries = getRoundSummaries(matches);
  const liveMatches = getLiveMatches(matches, latestSnapshotsByMatchId);
  const comingUpMatches = getComingUpMatches(roundSummaries, liveMatches);
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
    users: findLeaderboardUsers().map((user) => {
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
