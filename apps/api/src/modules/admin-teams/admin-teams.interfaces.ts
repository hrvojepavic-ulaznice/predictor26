export interface AdminTeamResponse {
  readonly normalizedName: string;
  readonly name: string;
  readonly displayName: string;
  readonly logoUrl: string | null;
  readonly groupName: string | null;
}

export interface AdminTeamsResponse {
  readonly teams: AdminTeamResponse[];
}

export interface UpdateAdminTeamDisplayNameRequest {
  readonly displayName: string;
  readonly secretCode: string;
}

export interface UpdateAdminTeamDisplayNameResponse {
  readonly team: AdminTeamResponse;
}

export interface UpdateAdminTeamLogoRequest {
  readonly logoDataUrl: string | null;
  readonly secretCode: string;
}

export interface UpdateAdminTeamLogoResponse {
  readonly team: AdminTeamResponse;
}
