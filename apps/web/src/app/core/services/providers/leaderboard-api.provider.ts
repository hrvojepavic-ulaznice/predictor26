import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { LeaderboardResponse } from '@models/leaderboard.models';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardApiProvider {
  private readonly http = inject(HttpClient);

  getLeaderboard() {
    return this.http.get<LeaderboardResponse>('/api/leaderboard');
  }
}
