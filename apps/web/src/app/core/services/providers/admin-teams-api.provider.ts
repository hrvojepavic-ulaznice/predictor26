import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AdminTeamsResponse,
  UpdateAdminTeamDisplayNameRequest,
  UpdateAdminTeamDisplayNameResponse,
  UpdateAdminTeamLogoRequest,
  UpdateAdminTeamLogoResponse
} from '@models/admin-team.models';

@Injectable({
  providedIn: 'root'
})
export class AdminTeamsApiProvider {
  private readonly http = inject(HttpClient);

  getTeams() {
    return this.http.get<AdminTeamsResponse>('/api/admin/teams');
  }

  updateDisplayName(normalizedName: string, request: UpdateAdminTeamDisplayNameRequest) {
    return this.http.patch<UpdateAdminTeamDisplayNameResponse>(
      `/api/admin/teams/${encodeURIComponent(normalizedName)}/display-name`,
      request
    );
  }

  updateLogo(normalizedName: string, request: UpdateAdminTeamLogoRequest) {
    return this.http.patch<UpdateAdminTeamLogoResponse>(`/api/admin/teams/${encodeURIComponent(normalizedName)}/logo`, request);
  }
}
