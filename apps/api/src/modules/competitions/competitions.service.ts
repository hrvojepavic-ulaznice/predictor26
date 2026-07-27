import { getWorldCupTeamNames } from '../world-cup-teams/world-cup-teams.service.js';
import {
  AdminCompetitionSettingsResponse,
  CompetitionResponse,
  CompetitionsResponse,
  UpdateAdminCompetitionSettingsRequest,
  UpdateCompetitionTiebreakerRequest,
  UpdateCompetitionTiebreakerResponse
} from './competitions.interfaces.js';
import { getSuperAdminUser, UserRole } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import {
  findCompetitionForUser,
  findCompetitionForAdmin,
  findCompetitionsForUser,
  findCompetitionsForAdmin,
  findDefaultCompetitionForUser,
  setCompetitionJobSettings,
  setCompetitionTiebreaker
} from './competitions.repository.js';

export type UpdateCompetitionTiebreakerResult =
  | {
      readonly status: 'updated';
      readonly response: UpdateCompetitionTiebreakerResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'not_found';
    };

export type UpdateAdminCompetitionSettingsResult =
  | {
      readonly status: 'updated';
      readonly settings: AdminCompetitionSettingsResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    }
  | {
      readonly status: 'not_found';
    };

export async function getCompetitionsForUser(userId: number, role: UserRole): Promise<CompetitionsResponse> {
  if (role === 'super_admin') {
    return getCompetitionsForAdmin();
  }

  return {
    competitions: findCompetitionsForUser(userId).map(toCompetitionResponse)
  };
}

export async function getCompetitionsForAdmin(): Promise<CompetitionsResponse> {
  return {
    competitions: findCompetitionsForAdmin().map(toCompetitionResponse)
  };
}

export async function resolveCompetitionIdForUser(userId: number, competitionId: number | null): Promise<number | null> {
  if (competitionId !== null) {
    return findCompetitionForUser(userId, competitionId)?.id ?? null;
  }

  return findDefaultCompetitionForUser(userId)?.id ?? null;
}

export async function resolveCompetitionIdForViewer(
  userId: number,
  role: UserRole,
  competitionId: number | null
): Promise<number | null> {
  if (role === 'super_admin') {
    if (competitionId !== null) {
      return findCompetitionForAdmin(competitionId)?.id ?? null;
    }

    return findCompetitionsForAdmin()[0]?.id ?? null;
  }

  return resolveCompetitionIdForUser(userId, competitionId);
}

export async function resolveCompetitionIdForAdmin(
  userId: number,
  role: UserRole,
  competitionId: number | null
): Promise<number | null> {
  if (role === 'super_admin') {
    if (competitionId !== null) {
      return findCompetitionForAdmin(competitionId)?.id ?? null;
    }

    return findCompetitionsForAdmin()[0]?.id ?? null;
  }

  return resolveCompetitionIdForViewer(userId, role, competitionId);
}

export async function updateTiebreakerForUser(
  userId: number,
  competitionId: number | null,
  input: Partial<UpdateCompetitionTiebreakerRequest> | undefined
): Promise<UpdateCompetitionTiebreakerResult> {
  if (typeof input?.tiebreakerName !== 'string') {
    return { status: 'invalid' };
  }

  const resolvedCompetitionId = await resolveCompetitionIdForUser(userId, competitionId);
  const tiebreakerName = input.tiebreakerName.trim();

  if (
    resolvedCompetitionId === null ||
    tiebreakerName.length < 1 ||
    tiebreakerName.length > 80 ||
    !getWorldCupTeamNames().includes(tiebreakerName)
  ) {
    return { status: 'invalid' };
  }

  const competition = setCompetitionTiebreaker(userId, resolvedCompetitionId, tiebreakerName);

  if (!competition) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    response: {
      competition: toCompetitionResponse(competition)
    }
  };
}

export async function getAdminCompetitionSettings(competitionId: number): Promise<AdminCompetitionSettingsResponse | null> {
  const competition = findCompetitionForAdmin(competitionId);

  return competition ? toAdminCompetitionSettingsResponse(competition) : null;
}

export async function updateAdminCompetitionSettings(
  competitionId: number,
  input: Partial<UpdateAdminCompetitionSettingsRequest> | undefined
): Promise<UpdateAdminCompetitionSettingsResult> {
  if (
    typeof input?.scheduleSourceUrl !== 'string' ||
    typeof input.oddsSourceUrl !== 'string' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > 128
  ) {
    return { status: 'invalid' };
  }

  const scheduleSourceUrl = input.scheduleSourceUrl.trim();
  const oddsSourceUrl = input.oddsSourceUrl.trim();

  if (!isValidSourceUrl(scheduleSourceUrl) || !isValidSourceUrl(oddsSourceUrl)) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const competition = setCompetitionJobSettings(competitionId, {
    scheduleSourceUrl,
    oddsSourceUrl
  });

  if (!competition) {
    return { status: 'not_found' };
  }

  return {
    status: 'updated',
    settings: toAdminCompetitionSettingsResponse(competition)
  };
}

function toCompetitionResponse(competition: {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly is_finished: 0 | 1;
  readonly tiebreaker_name: string | null;
}): CompetitionResponse {
  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    isFinished: competition.is_finished === 1,
    tiebreakerName: competition.tiebreaker_name ?? null
  };
}

function toAdminCompetitionSettingsResponse(competition: {
  readonly schedule_source_url: string;
  readonly odds_source_url: string;
  readonly notification_reminders_enabled: 0 | 1;
  readonly live_score_sync_enabled: 0 | 1;
}): AdminCompetitionSettingsResponse {
  return {
    scheduleSourceUrl: competition.schedule_source_url,
    oddsSourceUrl: competition.odds_source_url,
    notificationRemindersEnabled: competition.notification_reminders_enabled === 1,
    liveScoreSyncEnabled: competition.live_score_sync_enabled === 1
  };
}

function isValidSourceUrl(value: string): boolean {
  if (value.length < 1 || value.length > 500) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}
