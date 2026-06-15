export interface WorldCupTeamsResponse {
  readonly teams: string[];
  readonly groupTeams: WorldCupGroupTeam[];
}

export interface WorldCupGroupTeam {
  readonly name: string;
  readonly flag: string | null;
  readonly groupName: string;
}
