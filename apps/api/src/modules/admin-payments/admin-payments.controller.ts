import { NextFunction, Request, Response } from 'express';

import { UpdateAdminPaymentSettingsRequest } from './admin-payments.interfaces.js';
import { changeAdminPaymentSettings, getAdminPaymentSettings } from './admin-payments.service.js';
import { resolveCompetitionIdForAdmin } from '../competitions/competitions.service.js';

export async function getAdminPaymentSettingsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getAdminPaymentSettings(competitionId));
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPaymentSettingsController(
  req: Request<object, object, UpdateAdminPaymentSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeAdminPaymentSettings(competitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid payment settings.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json(result.settings);
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
