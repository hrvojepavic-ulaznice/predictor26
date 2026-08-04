import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminActionSecretRequest,
  AdminMatchesResponse,
  CreateManualMatchRequest,
  CreateManualMatchResponse,
  ImportMatchesResponse,
  ImportMatchesWithOddsResponse,
  ReleaseMatchRoundRequest,
  ReleaseMatchRoundResponse,
  SyncMatchOddsResponse,
  UpdateFinalScoreRequest,
  UpdateFinalScoreResponse,
  UpdateKickoffRequest,
  UpdateKickoffResponse,
  UpdatePostponedRequest,
  UpdatePostponedResponse,
  UpdatePlayoffMappingRequest,
  UpdatePlayoffMappingResponse
} from '@models/match.models';

@Injectable({
  providedIn: 'root'
})
export class AdminMatchesApiProvider {
  private readonly http = inject(HttpClient);

  getMatches() {
    return this.http.get<AdminMatchesResponse>('/api/admin/matches');
  }

  createMatch(request: CreateManualMatchRequest) {
    return this.http.post<CreateManualMatchResponse>('/api/admin/matches', request);
  }

  importMatches(request: AdminActionSecretRequest) {
    return this.http.post<ImportMatchesResponse>('/api/admin/matches/import', request);
  }

  importMatchesWithOdds(request: AdminActionSecretRequest) {
    return this.http.post<ImportMatchesWithOddsResponse>('/api/admin/matches/import-with-odds', request);
  }

  syncOdds(request: AdminActionSecretRequest) {
    return this.http.post<SyncMatchOddsResponse>('/api/admin/matches/sync-odds', request);
  }

  releaseRound(request: ReleaseMatchRoundRequest) {
    return this.http.post<ReleaseMatchRoundResponse>('/api/admin/matches/release-round', request);
  }

  updateFinalScore(matchId: number, request: UpdateFinalScoreRequest) {
    return this.http.patch<UpdateFinalScoreResponse>(`/api/admin/matches/${matchId}/final-score`, request);
  }

  updateKickoff(matchId: number, request: UpdateKickoffRequest) {
    return this.http.patch<UpdateKickoffResponse>(`/api/admin/matches/${matchId}/kickoff`, request);
  }

  updatePostponed(matchId: number, request: UpdatePostponedRequest) {
    return this.http.patch<UpdatePostponedResponse>(`/api/admin/matches/${matchId}/postponed`, request);
  }

  updatePlayoffMapping(matchId: number, request: UpdatePlayoffMappingRequest) {
    return this.http.patch<UpdatePlayoffMappingResponse>(`/api/admin/matches/${matchId}/playoff-mapping`, request);
  }
}
