import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { config } from '../../config/index.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  AdminTeamResponse,
  AdminTeamsResponse,
  UpdateAdminTeamDisplayNameRequest,
  UpdateAdminTeamLogoRequest
} from './admin-teams.interfaces.js';
import {
  AdminTeamRow,
  countTeamLogoUrlReferences,
  findAdminTeam,
  listAdminTeams,
  updateAdminTeamDisplayName,
  updateAdminTeamLogoUrl
} from './admin-teams.repository.js';

const displayNameMaxLength = 140;
const logoDataUrlMaxLength = 450_000;
const logoMaxBytes = 300_000;
const secretCodeMaxLength = 128;

export type UpdateAdminTeamDisplayNameResult =
  | {
      readonly status: 'updated';
      readonly team: AdminTeamResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'invalid_secret';
    };

export type UpdateAdminTeamLogoResult =
  | {
      readonly status: 'updated';
      readonly team: AdminTeamResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getAdminTeamsForCompetition(competitionId: number): Promise<AdminTeamsResponse> {
  return {
    teams: listAdminTeams(competitionId).map(toAdminTeamResponse)
  };
}

export async function changeAdminTeamDisplayName(
  competitionId: number,
  normalizedName: string,
  input: Partial<UpdateAdminTeamDisplayNameRequest> | undefined
): Promise<UpdateAdminTeamDisplayNameResult> {
  if (
    !isValidNormalizedName(normalizedName) ||
    typeof input?.displayName !== 'string' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  const displayName = input.displayName.trim();

  if (displayName.length < 1 || displayName.length > displayNameMaxLength) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  if (!findAdminTeam(competitionId, normalizedName)) {
    return { status: 'not_found' };
  }

  const team = updateAdminTeamDisplayName(competitionId, normalizedName, displayName);

  if (!team) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    team: toAdminTeamResponse(team)
  };
}

export async function changeAdminTeamLogo(
  competitionId: number,
  normalizedName: string,
  input: Partial<UpdateAdminTeamLogoRequest> | undefined
): Promise<UpdateAdminTeamLogoResult> {
  if (
    !isValidNormalizedName(normalizedName) ||
    !isValidNullableLogoDataUrl(input?.logoDataUrl) ||
    typeof input?.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const currentTeam = findAdminTeam(competitionId, normalizedName);

  if (!currentTeam) {
    return { status: 'not_found' };
  }

  const logoUrl = saveTeamLogo(readCanonicalTeamName(currentTeam), input.logoDataUrl);

  if (logoUrl === false) {
    return { status: 'invalid' };
  }

  const team = updateAdminTeamLogoUrl(competitionId, normalizedName, logoUrl);

  if (!team) {
    return { status: 'not_found' };
  }

  deletePreviousTeamLogoIfUnused(currentTeam.logo_url, team.logo_url);

  return {
    status: 'updated',
    team: toAdminTeamResponse(team)
  };
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}

function toAdminTeamResponse(team: AdminTeamRow): AdminTeamResponse {
  const name = readCanonicalTeamName(team);

  return {
    normalizedName: team.normalized_name,
    name,
    displayName: readDisplayName(team, name),
    logoUrl: team.logo_url || null,
    groupName: team.group_name
  };
}

function readCanonicalTeamName(team: AdminTeamRow): string {
  return team.name?.trim() || team.display_name?.trim() || team.normalized_name;
}

function readDisplayName(team: AdminTeamRow, fallbackName: string): string {
  return team.display_name?.trim() || fallbackName;
}

function isValidNormalizedName(value: string): boolean {
  return value.trim() === value && value.length >= 1 && value.length <= displayNameMaxLength;
}

function isValidNullableLogoDataUrl(value: unknown): value is string | null {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string' || value.length > logoDataUrlMaxLength) {
    return false;
  }

  return /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value);
}

function saveTeamLogo(teamName: string, logoDataUrl: string | null): string | false {
  if (logoDataUrl === null) {
    return '';
  }

  const match = /^data:image\/(png|jpeg|webp);base64,([a-z0-9+/]+=*)$/i.exec(logoDataUrl);

  if (!match) {
    return false;
  }

  const extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length < 1 || buffer.length > logoMaxBytes) {
    return false;
  }

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const fileName = `${slugifyTeamName(teamName)}-${hash}.${extension}`;

  mkdirSync(config.teamLogoAssetsPath, { recursive: true });
  writeFileSync(join(config.teamLogoAssetsPath, fileName), buffer);

  return `/api/assets/team-logos/${fileName}`;
}

function deletePreviousTeamLogoIfUnused(previousLogoUrl: string, nextLogoUrl: string): void {
  if (!previousLogoUrl || previousLogoUrl === nextLogoUrl || !previousLogoUrl.startsWith('/api/assets/team-logos/')) {
    return;
  }

  if (countTeamLogoUrlReferences(previousLogoUrl) > 0) {
    return;
  }

  const fileName = basename(previousLogoUrl);

  if (!fileName) {
    return;
  }

  const filePath = join(config.teamLogoAssetsPath, fileName);

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Deleting the old logo is best-effort; the DB update should remain successful.
  }
}

function slugifyTeamName(teamName: string): string {
  const slug = teamName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'team';
}
