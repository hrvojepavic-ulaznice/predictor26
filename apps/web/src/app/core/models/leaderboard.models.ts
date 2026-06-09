export interface LeaderboardRound {
  readonly label: string;
  readonly submittedCount: number;
  readonly expectedCount: number;
  readonly points: number;
}

export interface LeaderboardUser {
  readonly id: number;
  readonly username: string;
  readonly totalPoints: number;
  readonly rounds: LeaderboardRound[];
}

export interface LeaderboardResponse {
  readonly rounds: string[];
  readonly users: LeaderboardUser[];
  readonly totalUsers: number;
}
