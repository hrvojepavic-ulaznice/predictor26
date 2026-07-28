import { getWorldCupTeamNames } from '../world-cup-teams/world-cup-teams.service.js';
import {
  AdminCompetitionSettingsResponse,
  AdminRuleTemplatesResponse,
  CompetitionRulesResponse,
  DefaultCompetitionRulesResponse,
  CompetitionResponse,
  CompetitionsResponse,
  CreateAdminCompetitionRequest,
  JoinCompetitionRequest,
  JoinCompetitionResponse,
  UpdateAdminCompetitionSettingsRequest,
  UpdateCompetitionTiebreakerRequest,
  UpdateCompetitionTiebreakerResponse
} from './competitions.interfaces.js';
import { getSuperAdminUser, UserRole } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { hashPassword } from '../../shared/utils/password.js';
import {
  addCompetition,
  findCompetitionBySlug,
  findCompetitionForUser,
  findCompetitionForAdmin,
  findCompetitionRules,
  findCompetitionsForUser,
  findCompetitionsForAdmin,
  findDefaultCompetition,
  findDefaultCompetitionForUser,
  joinCompetitionForUser,
  findRuleTemplates,
  setCompetitionManagementSettings,
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

export type CreateAdminCompetitionResult =
  | {
      readonly status: 'created';
      readonly competition: CompetitionResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export type JoinCompetitionResult =
  | {
      readonly status: 'joined';
      readonly response: JoinCompetitionResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_passcode';
    }
  | {
      readonly status: 'not_found';
    }
  | {
      readonly status: 'finished';
    }
  | {
      readonly status: 'forbidden';
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

export async function joinCompetition(
  userId: number,
  role: UserRole,
  competitionId: number,
  input: Partial<JoinCompetitionRequest> | undefined
): Promise<JoinCompetitionResult> {
  if (role === 'super_admin') {
    return { status: 'forbidden' };
  }

  if (
    !Number.isInteger(competitionId) ||
    competitionId < 1 ||
    typeof input?.passcode !== 'string' ||
    input.passcode.trim().length < 1 ||
    input.passcode.length > 120
  ) {
    return { status: 'invalid' };
  }

  const competition = findCompetitionForAdmin(competitionId);

  if (!competition) {
    return { status: 'not_found' };
  }

  if (competition.is_finished === 1) {
    return { status: 'finished' };
  }

  if (!competition.passcode_hash || !verifyPassword(input.passcode.trim(), competition.passcode_hash)) {
    return { status: 'invalid_passcode' };
  }

  const joinedCompetition = joinCompetitionForUser(userId, competitionId);

  if (!joinedCompetition) {
    return { status: 'not_found' };
  }

  return {
    status: 'joined',
    response: {
      competition: toCompetitionResponse(joinedCompetition)
    }
  };
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

export async function getCompetitionRulesForViewer(
  userId: number,
  role: UserRole,
  competitionId: number | null
): Promise<CompetitionRulesResponse | null> {
  const resolvedCompetitionId = await resolveCompetitionIdForViewer(userId, role, competitionId);

  if (resolvedCompetitionId === null) {
    return null;
  }

  const competition = role === 'super_admin' ? findCompetitionForAdmin(resolvedCompetitionId) : findCompetitionForUser(userId, resolvedCompetitionId);

  if (!competition) {
    return null;
  }

  return {
    competition: toCompetitionResponse(competition),
    rules: findCompetitionRules(resolvedCompetitionId).map(renderRule)
  };
}

export async function getDefaultCompetitionRules(): Promise<DefaultCompetitionRulesResponse> {
  const competition = findDefaultCompetition();
  const rules = competition
    ? findCompetitionRules(competition.id).map(renderRule)
    : findRuleTemplates().map((template) => renderRule({ text_template: template.text_template, value: template.default_value }));

  return {
    rules
  };
}

export async function getAdminRuleTemplates(): Promise<AdminRuleTemplatesResponse> {
  return {
    templates: findRuleTemplates().map((template) => ({
      key: template.key,
      textTemplate: template.text_template,
      valueLabel: template.value_label,
      defaultValue: template.default_value
    }))
  };
}

export async function createAdminCompetition(
  input: Partial<CreateAdminCompetitionRequest> | undefined
): Promise<CreateAdminCompetitionResult> {
  const parsed = await parseAdminCompetitionInput(input, true);

  if (parsed.status !== 'valid') {
    return parsed;
  }

  const slug = createUniqueSlug(parsed.name);
  const competition = addCompetition({
    name: parsed.name,
    slug,
    logoUrl: parsed.logoUrl,
    passcodeHash: hashPassword(parsed.passcode!),
    isFinished: parsed.isFinished,
    scheduleSourceUrl: parsed.scheduleSourceUrl,
    oddsSourceUrl: parsed.oddsSourceUrl,
    rules: parsed.rules
  });

  return {
    status: 'created',
    competition: toCompetitionResponse(competition)
  };
}

export async function updateAdminCompetitionSettings(
  competitionId: number,
  input: Partial<UpdateAdminCompetitionSettingsRequest> | undefined
): Promise<UpdateAdminCompetitionSettingsResult> {
  const existing = findCompetitionForAdmin(competitionId);

  if (!existing) {
    return { status: 'not_found' };
  }

  const parsed = await parseAdminCompetitionInput(input, false);

  if (parsed.status !== 'valid') {
    return parsed;
  }

  const slug = createUniqueSlug(parsed.name, competitionId);
  const competition = setCompetitionManagementSettings(competitionId, {
    name: parsed.name,
    slug,
    logoUrl: parsed.logoUrl,
    passcodeHash: parsed.passcode ? hashPassword(parsed.passcode) : undefined,
    isFinished: parsed.isFinished,
    scheduleSourceUrl: parsed.scheduleSourceUrl,
    oddsSourceUrl: parsed.oddsSourceUrl,
    rules: parsed.rules
  });

  return {
    status: 'updated',
    settings: toAdminCompetitionSettingsResponse(competition!)
  };
}

function toCompetitionResponse(competition: {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly logo_url: string;
  readonly is_finished: 0 | 1;
  readonly is_joined: 0 | 1;
  readonly tiebreaker_name: string | null;
}): CompetitionResponse {
  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    logoUrl: competition.logo_url || null,
    isFinished: competition.is_finished === 1,
    isJoined: competition.is_joined === 1,
    tiebreakerName: competition.tiebreaker_name ?? null
  };
}

function toAdminCompetitionSettingsResponse(competition: {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly logo_url: string;
  readonly passcode_hash: string | null;
  readonly schedule_source_url: string;
  readonly odds_source_url: string;
  readonly notification_reminders_enabled: 0 | 1;
  readonly live_score_sync_enabled: 0 | 1;
  readonly is_finished: 0 | 1;
}): AdminCompetitionSettingsResponse {
  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    logoUrl: competition.logo_url || null,
    isFinished: competition.is_finished === 1,
    passcodeSet: competition.passcode_hash !== null,
    scheduleSourceUrl: competition.schedule_source_url,
    oddsSourceUrl: competition.odds_source_url,
    notificationRemindersEnabled: competition.notification_reminders_enabled === 1,
    liveScoreSyncEnabled: competition.live_score_sync_enabled === 1,
    rules: findCompetitionRules(competition.id).map((rule) => ({
      key: rule.key,
      textTemplate: rule.text_template,
      valueLabel: rule.value_label,
      defaultValue: rule.default_value,
      value: rule.value
    }))
  };
}

function isValidSourceUrl(value: string): boolean {
  if (value.length > 500) {
    return false;
  }

  if (value.length === 0) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidLogoUrl(value: string): boolean {
  if (value.length === 0) {
    return true;
  }

  if (value.length > 200000) {
    return false;
  }

  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value)) {
    return true;
  }

  if (value.length > 500) {
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

async function parseAdminCompetitionInput(
  input: Partial<CreateAdminCompetitionRequest | UpdateAdminCompetitionSettingsRequest> | undefined,
  requirePasscode: boolean
): Promise<
  | {
      readonly status: 'valid';
      readonly name: string;
      readonly logoUrl: string;
      readonly passcode: string | null;
      readonly isFinished: boolean;
      readonly scheduleSourceUrl: string;
      readonly oddsSourceUrl: string;
      readonly rules: ReadonlyArray<{ readonly templateKey: string; readonly value: string | null; readonly sortOrder: number }>;
    }
  | { readonly status: 'invalid' }
  | { readonly status: 'invalid_secret' }
> {
  if (
    typeof input?.name !== 'string' ||
    typeof input.isFinished !== 'boolean' ||
    typeof input.scheduleSourceUrl !== 'string' ||
    typeof input.oddsSourceUrl !== 'string' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > 128 ||
    !Array.isArray(input.rules)
  ) {
    return { status: 'invalid' };
  }

  const name = input.name.trim();
  const logoUrl = typeof input.logoUrl === 'string' ? input.logoUrl.trim() : '';
  const passcode = typeof input.passcode === 'string' ? input.passcode.trim() : null;
  const scheduleSourceUrl = input.scheduleSourceUrl.trim();
  const oddsSourceUrl = input.oddsSourceUrl.trim();

  if (
    name.length < 1 ||
    name.length > 120 ||
    !isValidLogoUrl(logoUrl) ||
    (requirePasscode && (!passcode || passcode.length < 4)) ||
    (passcode !== null && passcode.length > 120) ||
    !isValidSourceUrl(scheduleSourceUrl) ||
    !isValidSourceUrl(oddsSourceUrl)
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  const templates = findRuleTemplates();
  const templateMap = new Map(templates.map((template) => [template.key, template]));
  const seenTemplateKeys = new Set<string>();
  const rules: Array<{ readonly templateKey: string; readonly value: string | null; readonly sortOrder: number }> = [];

  for (const rule of input.rules) {
    if (typeof rule !== 'object' || rule === null || typeof rule.templateKey !== 'string') {
      return { status: 'invalid' };
    }

    const template = templateMap.get(rule.templateKey);

    if (!template || seenTemplateKeys.has(rule.templateKey)) {
      return { status: 'invalid' };
    }

    const value = typeof rule.value === 'string' ? rule.value.trim() : null;

    if (template.value_label && (!value || value.length > 120)) {
      return { status: 'invalid' };
    }

    if (!template.value_label && value !== null) {
      return { status: 'invalid' };
    }

    seenTemplateKeys.add(rule.templateKey);
    rules.push({
      templateKey: rule.templateKey,
      value,
      sortOrder: rules.length + 1
    });
  }

  return {
    status: 'valid',
    name,
    logoUrl,
    passcode,
    isFinished: input.isFinished,
    scheduleSourceUrl,
    oddsSourceUrl,
    rules
  };
}

function renderRule(rule: { readonly text_template: string; readonly value: string | null }): string {
  return rule.text_template.replace('{{value}}', rule.value ?? '');
}

function createUniqueSlug(name: string, currentCompetitionId?: number): string {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = findCompetitionBySlug(slug);

    if (!existing || existing.id === currentCompetitionId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  return slug || 'competition';
}
