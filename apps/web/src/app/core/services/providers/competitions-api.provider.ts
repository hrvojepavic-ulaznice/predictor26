import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminCompetitionSettings,
  AdminRuleTemplatesResponse,
  CompetitionRulesResponse,
  CompetitionsResponse,
  CreateAdminCompetitionRequest,
  CreateAdminCompetitionResponse,
  DefaultCompetitionRulesResponse,
  JoinCompetitionRequest,
  JoinCompetitionResponse,
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

  createAdminCompetition(request: CreateAdminCompetitionRequest) {
    return this.http.post<CreateAdminCompetitionResponse>('/api/admin/competitions', request);
  }

  getAdminRuleTemplates() {
    return this.http.get<AdminRuleTemplatesResponse>('/api/admin/rule-templates');
  }

  getCompetitionRules() {
    return this.http.get<CompetitionRulesResponse>('/api/competitions/current/rules');
  }

  getDefaultCompetitionRules() {
    return this.http.get<DefaultCompetitionRulesResponse>('/api/competitions/default/rules');
  }

  updateTiebreaker(request: UpdateCompetitionTiebreakerRequest) {
    return this.http.put<UpdateCompetitionTiebreakerResponse>('/api/competitions/current/tiebreaker', request);
  }

  joinCompetition(competitionId: number, request: JoinCompetitionRequest) {
    return this.http.post<JoinCompetitionResponse>(`/api/competitions/${competitionId}/join`, request);
  }

  getAdminCompetitionSettings() {
    return this.http.get<AdminCompetitionSettings>('/api/admin/competitions/current/settings');
  }

  updateAdminCompetitionSettings(request: UpdateAdminCompetitionSettingsRequest) {
    return this.http.patch<AdminCompetitionSettings>('/api/admin/competitions/current/settings', request);
  }
}
