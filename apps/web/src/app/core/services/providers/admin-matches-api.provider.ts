import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminMatchesResponse,
  ImportMatchesResponse,
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

  importMatches() {
    return this.http.post<ImportMatchesResponse>('/api/admin/matches/import', {});
  }

  updateFinalScore(matchId: number, request: UpdateFinalScoreRequest) {
    return this.http.patch<UpdateFinalScoreResponse>(`/api/admin/matches/${matchId}/final-score`, request);
  }
}
