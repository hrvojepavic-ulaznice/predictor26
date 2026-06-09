export interface LeaderboardRoundResponse {
  readonly label: string;
  readonly submittedCount: number;
  readonly expectedCount: number;
  readonly points: number;
}

export interface LeaderboardUserResponse {
  readonly id: number;
  readonly username: string;
  readonly totalPoints: number;
  readonly rounds: LeaderboardRoundResponse[];
}

export interface LeaderboardResponse {
  readonly rounds: string[];
  readonly users: LeaderboardUserResponse[];
  readonly totalUsers: number;
}
