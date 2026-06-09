import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminActionSecretRequest,
  AdminMatchesResponse,
  ImportMatchesResponse,
  SyncMatchOddsResponse,
  UpdateFinalScoreRequest,
  UpdateFinalScoreResponse
} from '@models/match.models';

@Injectable({
  providedIn: 'root'
})
export class AdminMatchesApiProvider {
  private readonly http = inject(HttpClient);

  getMatches() {
    return this.http.get<AdminMatchesResponse>('/api/admin/matches');
  }

  importMatches(request: AdminActionSecretRequest) {
    return this.http.post<ImportMatchesResponse>('/api/admin/matches/import', request);
  }

  syncOdds(request: AdminActionSecretRequest) {
    return this.http.post<SyncMatchOddsResponse>('/api/admin/matches/sync-odds', request);
  }

  updateFinalScore(matchId: number, request: UpdateFinalScoreRequest) {
    return this.http.patch<UpdateFinalScoreResponse>(`/api/admin/matches/${matchId}/final-score`, request);
  }
}
