export interface WorldCupTeamsResponse {
  readonly teams: string[];
  readonly groupTeams: WorldCupGroupTeamResponse[];
}

export interface WorldCupGroupTeamResponse {
  readonly name: string;
  readonly flag: string | null;
  readonly groupName: string;
}
