import { NextFunction, Request, Response } from 'express';

import { UpdateAdminTeamDisplayNameRequest, UpdateAdminTeamLogoRequest } from './admin-teams.interfaces.js';
import { changeAdminTeamDisplayName, changeAdminTeamLogo, getAdminTeamsForCompetition } from './admin-teams.service.js';
import { resolveCompetitionIdForAdmin } from '../competitions/competitions.service.js';

interface TeamParams {
  readonly normalizedName: string;
}

export async function getAdminTeamsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getAdminTeamsForCompetition(competitionId));
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTeamDisplayNameController(
  req: Request<TeamParams, object, UpdateAdminTeamDisplayNameRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeAdminTeamDisplayName(competitionId, req.params.normalizedName, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid display name.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Team could not be found.' });
      return;
    }

    res.json({ team: result.team });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTeamLogoController(
  req: Request<TeamParams, object, UpdateAdminTeamLogoRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeAdminTeamLogo(competitionId, req.params.normalizedName, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please choose a valid PNG, JPG, or WebP team icon.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Team could not be found.' });
      return;
    }

    res.json({ team: result.team });
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
