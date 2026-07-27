import { NextFunction, Request, Response } from 'express';

import { UpdateAdminCompetitionSettingsRequest, UpdateCompetitionTiebreakerRequest } from './competitions.interfaces.js';
import {
  getAdminCompetitionSettings,
  getCompetitionsForAdmin,
  getCompetitionsForUser,
  resolveCompetitionIdForAdmin,
  updateAdminCompetitionSettings,
  updateTiebreakerForUser
} from './competitions.service.js';

export async function getCompetitionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getCompetitionsForUser(req.authUser!.id, req.authUser!.role));
  } catch (error) {
    next(error);
  }
}

export async function getAdminCompetitionsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getCompetitionsForAdmin());
  } catch (error) {
    next(error);
  }
}

export async function updateCompetitionTiebreakerController(
  req: Request<object, object, UpdateCompetitionTiebreakerRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.authUser!.role === 'super_admin') {
      res.status(403).json({ message: 'Super admin cannot participate in competitions.' });
      return;
    }

    const headerValue = req.header('x-competition-id');
    const requestedCompetitionId = headerValue ? Number(headerValue) : null;
    const result = await updateTiebreakerForUser(req.authUser!.id, requestedCompetitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please choose a valid winner.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(result.response);
  } catch (error) {
    next(error);
  }
}

export async function getAdminCompetitionSettingsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedAdminCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const settings = await getAdminCompetitionSettings(competitionId);

    if (!settings) {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminCompetitionSettingsController(
  req: Request<object, object, UpdateAdminCompetitionSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedAdminCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await updateAdminCompetitionSettings(competitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid HTTPS source URLs.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(result.settings);
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedAdminCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
