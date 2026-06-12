import { getAppMetadataValue, setAppMetadataValue } from '../../database/queries/app-metadata.queries.js';
import { getSuperAdminUser } from '../../database/queries/users.queries.js';
import { verifyPassword } from '../../shared/utils/password.js';
import { CompetitionSettingsResponse, UpdateCompetitionSettingsRequest } from './competition-settings.interfaces.js';

const registrationsDisabledKey = 'competition_registrations_disabled';
const secretCodeMaxLength = 128;

export type UpdateCompetitionSettingsResult =
  | {
      readonly status: 'updated';
      readonly settings: CompetitionSettingsResponse;
    }
  | {
      readonly status: 'invalid';
    }
  | {
      readonly status: 'invalid_secret';
    };

export async function getCompetitionSettings(): Promise<CompetitionSettingsResponse> {
  return {
    registrationsDisabled: await areRegistrationsDisabled()
  };
}

export async function updateCompetitionSettings(
  input: Partial<UpdateCompetitionSettingsRequest> | undefined
): Promise<UpdateCompetitionSettingsResult> {
  if (
    typeof input?.registrationsDisabled !== 'boolean' ||
    typeof input.secretCode !== 'string' ||
    input.secretCode.length < 1 ||
    input.secretCode.length > secretCodeMaxLength
  ) {
    return { status: 'invalid' };
  }

  if (!(await isValidSecretCode(input.secretCode))) {
    return { status: 'invalid_secret' };
  }

  setAppMetadataValue(registrationsDisabledKey, input.registrationsDisabled ? 'true' : 'false');

  return {
    status: 'updated',
    settings: {
      registrationsDisabled: input.registrationsDisabled
    }
  };
}

export async function areRegistrationsDisabled(): Promise<boolean> {
  return (await getAppMetadataValue(registrationsDisabledKey)) === 'true';
}

async function isValidSecretCode(secretCode: string): Promise<boolean> {
  const superAdmin = await getSuperAdminUser();

  return Boolean(superAdmin && verifyPassword(secretCode, superAdmin.password_hash));
}
