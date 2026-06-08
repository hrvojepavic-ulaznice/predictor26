import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { WorldCupTeamsResponse } from '@models/world-cup-team.models';

@Injectable({
  providedIn: 'root'
})
export class WorldCupTeamsApiProvider {
  private readonly http = inject(HttpClient);

  getWorldCupTeams() {
    return this.http.get<WorldCupTeamsResponse>('/api/world-cup-teams');
  }
}
