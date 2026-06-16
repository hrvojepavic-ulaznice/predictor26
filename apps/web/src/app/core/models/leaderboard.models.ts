import { MatchOdds, MatchPrediction, MatchScore, MatchTeam } from './match.models';

export type LeaderboardPredictionPointsState = 'pending' | 'miss' | 'outcome' | 'exact';

export interface LeaderboardRoundMetadata {
  readonly label: string;
  readonly locked: boolean;
  readonly viewable: boolean;
}

export interface LeaderboardLiveMatch {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
  readonly finalScore: MatchScore | null;
}

export interface LeaderboardLivePrediction {
  readonly matchId: number;
  readonly prediction: MatchPrediction | null;
}

export interface LeaderboardComingUpMatch {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
}

export interface LeaderboardComingUpPrediction {
  readonly matchId: number;
  readonly prediction: MatchPrediction | null;
}

export interface LeaderboardPredictionPoints {
  readonly earned: number | null;
  readonly available: number | null;
  readonly state: LeaderboardPredictionPointsState;
}

export interface LeaderboardRoundMatch {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
  readonly prediction: MatchPrediction | null;
  readonly predictionHidden: boolean;
  readonly finalScore: MatchScore | null;
  readonly points: LeaderboardPredictionPoints;
}

export interface LeaderboardRound {
  readonly label: string;
  readonly submittedCount: number;
  readonly expectedCount: number;
  readonly points: number;
  readonly locked: boolean;
  readonly viewable: boolean;
}

export interface LeaderboardRoundDetails extends LeaderboardRound {
  readonly matches: LeaderboardRoundMatch[];
}

export interface LeaderboardUser {
  readonly id: number;
  readonly username: string;
  readonly totalPoints: number;
  readonly liveRankMovement: number;
  readonly livePredictions: LeaderboardLivePrediction[];
  readonly comingUpPredictions: LeaderboardComingUpPrediction[];
  readonly rounds: LeaderboardRound[];
}

export interface LeaderboardResponse {
  readonly rounds: LeaderboardRoundMetadata[];
  readonly liveMatches: LeaderboardLiveMatch[];
  readonly comingUpMatches: LeaderboardComingUpMatch[];
  readonly users: LeaderboardUser[];
  readonly totalUsers: number;
}

export interface LeaderboardUserRoundDetailsResponse {
  readonly round: LeaderboardRoundDetails;
}

export type LeaderboardMatchStatus = 'finished' | 'live' | 'coming_up' | 'undecided';

export interface LeaderboardMatchDay {
  readonly date: string;
  readonly matches: LeaderboardDayMatch[];
}

export interface LeaderboardDayMatch {
  readonly matchId: number;
  readonly matchNumber: number;
  readonly kickoffAt: string;
  readonly status: LeaderboardMatchStatus;
  readonly roundLocked: boolean;
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
  readonly odds: MatchOdds | null;
  readonly finalScore: MatchScore | null;
}

export interface LeaderboardMatchPredictionUser {
  readonly userId: number;
  readonly username: string;
  readonly prediction: MatchPrediction | null;
  readonly predictionHidden: boolean;
  readonly points: LeaderboardPredictionPoints;
}

export interface LeaderboardMatchPredictionsResponse {
  readonly match: LeaderboardDayMatch;
  readonly locked: boolean;
  readonly users: LeaderboardMatchPredictionUser[];
}

export interface LeaderboardMatchDaysResponse {
  readonly days: LeaderboardMatchDay[];
}

export interface LeaderboardStatsUserRank {
  readonly userId: number;
  readonly username: string;
  readonly points: number;
  readonly exactScores: number;
  readonly correctOutcomes: number;
}

export interface LeaderboardStatsGroup {
  readonly groupName: string;
  readonly leaders: LeaderboardStatsUserRank[];
}

export interface LeaderboardStatsExactScoreLeader {
  readonly userId: number;
  readonly username: string;
  readonly exactScores: number;
}

export interface LeaderboardStatsOutcomeLeader {
  readonly userId: number;
  readonly username: string;
  readonly correctOutcomes: number;
}

export interface LeaderboardStatsBiggestOddsWin {
  readonly userId: number;
  readonly username: string;
  readonly odds: number;
  readonly matchNumber: number;
  readonly homeTeam: MatchTeam;
  readonly awayTeam: MatchTeam;
  readonly prediction: MatchPrediction;
  readonly finalScore: MatchScore;
}

export interface LeaderboardStatsResponse {
  readonly groupLeaders: LeaderboardStatsGroup[];
  readonly exactScoreLeaders: LeaderboardStatsExactScoreLeader[];
  readonly outcomeLeaders: LeaderboardStatsOutcomeLeader[];
  readonly biggestOddsWin: LeaderboardStatsBiggestOddsWin | null;
}
