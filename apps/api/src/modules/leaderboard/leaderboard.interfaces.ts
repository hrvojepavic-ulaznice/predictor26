import { MatchOddsResponse, PredictionResponse, ScoreResponse, TeamSlotResponse } from '../matches/matches.interfaces.js';

export type LeaderboardPredictionPointsState = 'pending' | 'miss' | 'outcome' | 'exact';

export interface LeaderboardRoundMetadataResponse {
  readonly label: string;
  readonly locked: boolean;
  readonly viewable: boolean;
}

export interface LeaderboardLiveMatchResponse {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly finalScore: ScoreResponse | null;
}

export interface LeaderboardLivePredictionResponse {
  readonly matchId: number;
  readonly prediction: PredictionResponse | null;
}

export interface LeaderboardComingUpMatchResponse {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
}

export interface LeaderboardComingUpPredictionResponse {
  readonly matchId: number;
  readonly prediction: PredictionResponse | null;
}

export interface LeaderboardPredictionPointsResponse {
  readonly earned: number | null;
  readonly available: number | null;
  readonly state: LeaderboardPredictionPointsState;
}

export interface LeaderboardRoundMatchResponse {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly prediction: PredictionResponse | null;
  readonly predictionHidden: boolean;
  readonly finalScore: ScoreResponse | null;
  readonly points: LeaderboardPredictionPointsResponse;
}

export interface LeaderboardRoundResponse {
  readonly label: string;
  readonly submittedCount: number;
  readonly expectedCount: number;
  readonly points: number;
  readonly locked: boolean;
  readonly viewable: boolean;
}

export interface LeaderboardRoundDetailsResponse extends LeaderboardRoundResponse {
  readonly matches: LeaderboardRoundMatchResponse[];
}

export interface LeaderboardUserResponse {
  readonly id: number;
  readonly username: string;
  readonly totalPoints: number;
  readonly liveRankMovement: number;
  readonly livePredictions: LeaderboardLivePredictionResponse[];
  readonly comingUpPredictions: LeaderboardComingUpPredictionResponse[];
  readonly rounds: LeaderboardRoundResponse[];
}

export interface LeaderboardResponse {
  readonly rounds: LeaderboardRoundMetadataResponse[];
  readonly liveMatches: LeaderboardLiveMatchResponse[];
  readonly comingUpMatches: LeaderboardComingUpMatchResponse[];
  readonly users: LeaderboardUserResponse[];
  readonly totalUsers: number;
}

export interface LeaderboardUserRoundDetailsResponse {
  readonly round: LeaderboardRoundDetailsResponse;
}

export type LeaderboardMatchStatusResponse = 'finished' | 'live' | 'coming_up' | 'undecided';

export interface LeaderboardMatchDayResponse {
  readonly date: string;
  readonly matches: LeaderboardDayMatchResponse[];
}

export interface LeaderboardDayMatchResponse {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly status: LeaderboardMatchStatusResponse;
  readonly roundLocked: boolean;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly odds: MatchOddsResponse | null;
  readonly finalScore: ScoreResponse | null;
}

export interface LeaderboardMatchPredictionUserResponse {
  readonly userId: number;
  readonly username: string;
  readonly prediction: PredictionResponse | null;
  readonly predictionHidden: boolean;
  readonly points: LeaderboardPredictionPointsResponse;
}

export interface LeaderboardMatchPredictionsResponse {
  readonly match: LeaderboardDayMatchResponse;
  readonly locked: boolean;
  readonly users: LeaderboardMatchPredictionUserResponse[];
}

export interface LeaderboardStatsUserRankResponse {
  readonly userId: number;
  readonly username: string;
  readonly points: number;
  readonly exactScores: number;
  readonly correctOutcomes: number;
}

export interface LeaderboardStatsGroupResponse {
  readonly groupName: string;
  readonly leaders: LeaderboardStatsUserRankResponse[];
}

export interface LeaderboardStatsExactScoreLeaderResponse {
  readonly userId: number;
  readonly username: string;
  readonly exactScores: number;
  readonly matches: LeaderboardStatsExactScoreMatchResponse[];
}

export interface LeaderboardStatsExactScoreMatchResponse {
  readonly matchNumber: number;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly finalScore: ScoreResponse;
}

export interface LeaderboardStatsOutcomeLeaderResponse {
  readonly userId: number;
  readonly username: string;
  readonly correctOutcomes: number;
  readonly matches: LeaderboardStatsOutcomeMatchResponse[];
}

export interface LeaderboardStatsOutcomeMatchResponse {
  readonly matchNumber: number;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
  readonly outcome: '1' | 'X' | '2';
}

export interface LeaderboardStatsBiggestOddsWinResponse {
  readonly userId: number;
  readonly username: string;
  readonly odds: number;
  readonly outcome: '1' | 'X' | '2';
  readonly matchNumber: number;
  readonly homeTeam: TeamSlotResponse;
  readonly awayTeam: TeamSlotResponse;
}

export interface LeaderboardStatsResponse {
  readonly groupLeaders: LeaderboardStatsGroupResponse[];
  readonly exactScoreLeaders: LeaderboardStatsExactScoreLeaderResponse[];
  readonly outcomeLeaders: LeaderboardStatsOutcomeLeaderResponse[];
  readonly biggestOddsWin: LeaderboardStatsBiggestOddsWinResponse | null;
}
