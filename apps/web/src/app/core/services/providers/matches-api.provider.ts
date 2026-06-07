import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { MatchesResponse, SavePredictionRequest, SavePredictionResponse } from '@models/match.models';

@Injectable({
  providedIn: 'root'
})
export class MatchesApiProvider {
  private readonly http = inject(HttpClient);

  getMatches() {
    return this.http.get<MatchesResponse>('/api/matches');
  }

  getPredictedMatches() {
    return this.http.get<MatchesResponse>('/api/matches/predicted');
  }

  savePrediction(matchId: number, request: SavePredictionRequest) {
    return this.http.put<SavePredictionResponse>(`/api/matches/${matchId}/prediction`, request);
  }
}
