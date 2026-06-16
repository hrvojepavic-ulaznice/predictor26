import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  LeaderboardMatchDaysResponse,
  LeaderboardMatchPredictionsResponse,
  LeaderboardResponse,
  LeaderboardStatsResponse,
  LeaderboardUserRoundDetailsResponse
} from '@models/leaderboard.models';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardApiProvider {
  private readonly http = inject(HttpClient);

  getLeaderboard() {
    return this.http.get<LeaderboardResponse>('/api/leaderboard');
  }

  getUserRoundDetails(userId: number, roundLabel: string) {
    return this.http.get<LeaderboardUserRoundDetailsResponse>(
      `/api/leaderboard/users/${userId}/rounds/${encodeURIComponent(roundLabel)}`
    );
  }

  getMatchDays() {
    return this.http.get<LeaderboardMatchDaysResponse>('/api/leaderboard/matches/days');
  }

  getMatchPredictions(matchId: number) {
    return this.http.get<LeaderboardMatchPredictionsResponse>(`/api/leaderboard/matches/${matchId}/predictions`);
  }

  getStats() {
    return this.http.get<LeaderboardStatsResponse>('/api/leaderboard/stats');
  }
}
