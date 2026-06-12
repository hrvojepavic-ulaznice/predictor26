import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { CompetitionSettings, UpdateCompetitionSettingsRequest } from '@models/competition-settings.models';

@Injectable({
  providedIn: 'root'
})
export class CompetitionSettingsApiProvider {
  private readonly http = inject(HttpClient);

  getSettings() {
    return this.http.get<CompetitionSettings>('/api/competition/settings');
  }

  getAdminSettings() {
    return this.http.get<CompetitionSettings>('/api/admin/competition/settings');
  }

  updateAdminSettings(settings: UpdateCompetitionSettingsRequest) {
    return this.http.patch<CompetitionSettings>('/api/admin/competition/settings', settings);
  }
}
