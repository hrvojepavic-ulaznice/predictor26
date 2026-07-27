import { Request, Response, NextFunction } from 'express';

import { getPaymentInfoForUser } from './payments.service.js';
import { resolveCompetitionIdForViewer } from '../competitions/competitions.service.js';

export async function getPaymentInfoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.authUser) {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getPaymentInfoForUser(req.authUser.id, competitionId));
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedCompetitionId(req: Request): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForViewer(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
