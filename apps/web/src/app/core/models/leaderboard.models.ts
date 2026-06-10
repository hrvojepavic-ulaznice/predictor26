import { MatchPrediction, MatchScore, MatchTeam } from './match.models';

export type LeaderboardPredictionPointsState = 'pending' | 'miss' | 'outcome' | 'exact';

export interface LeaderboardRoundMetadata {
  readonly label: string;
  readonly locked: boolean;
  readonly viewable: boolean;
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
  readonly rounds: LeaderboardRound[];
}

export interface LeaderboardResponse {
  readonly rounds: LeaderboardRoundMetadata[];
  readonly users: LeaderboardUser[];
  readonly totalUsers: number;
}

export interface LeaderboardUserRoundDetailsResponse {
  readonly round: LeaderboardRoundDetails;
}
