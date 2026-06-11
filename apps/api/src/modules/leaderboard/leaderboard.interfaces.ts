import { PredictionResponse, ScoreResponse, TeamSlotResponse } from '../matches/matches.interfaces.js';

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
}

export interface LeaderboardLivePredictionResponse {
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
  readonly livePredictions: LeaderboardLivePredictionResponse[];
  readonly rounds: LeaderboardRoundResponse[];
}

export interface LeaderboardResponse {
  readonly rounds: LeaderboardRoundMetadataResponse[];
  readonly liveMatches: LeaderboardLiveMatchResponse[];
  readonly users: LeaderboardUserResponse[];
  readonly totalUsers: number;
}

export interface LeaderboardUserRoundDetailsResponse {
  readonly round: LeaderboardRoundDetailsResponse;
}
