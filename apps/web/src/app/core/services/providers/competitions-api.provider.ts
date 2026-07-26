import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminCompetitionSettings,
  CompetitionsResponse,
  UpdateAdminCompetitionSettingsRequest,
  UpdateCompetitionTiebreakerRequest,
  UpdateCompetitionTiebreakerResponse
} from '@models/competition.models';

@Injectable({
  providedIn: 'root'
})
export class CompetitionsApiProvider {
  private readonly http = inject(HttpClient);

  getCompetitions() {
    return this.http.get<CompetitionsResponse>('/api/competitions');
  }

  getAdminCompetitions() {
    return this.http.get<CompetitionsResponse>('/api/admin/competitions');
  }

  updateTiebreaker(request: UpdateCompetitionTiebreakerRequest) {
    return this.http.put<UpdateCompetitionTiebreakerResponse>('/api/competitions/current/tiebreaker', request);
  }

  getAdminCompetitionSettings() {
    return this.http.get<AdminCompetitionSettings>('/api/admin/competitions/current/settings');
  }

  updateAdminCompetitionSettings(request: UpdateAdminCompetitionSettingsRequest) {
    return this.http.patch<AdminCompetitionSettings>('/api/admin/competitions/current/settings', request);
  }
}
