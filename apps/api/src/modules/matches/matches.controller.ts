import { NextFunction, Request, Response } from 'express';

import { SavePredictionRequest } from './matches.interfaces.js';
import { getMatchesForUser, getPredictedMatchesForUser, submitPrediction } from './matches.service.js';
import { resolveCompetitionIdForViewer } from '../competitions/competitions.service.js';

export async function getMatchesController(
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

    res.json(await getMatchesForUser(req.authUser!.id, competitionId));
  } catch (error) {
    next(error);
  }
}

export async function getPredictedMatchesController(
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

    res.json(await getPredictedMatchesForUser(req.authUser!.id, competitionId));
  } catch (error) {
    next(error);
  }
}

export async function savePredictionController(
  req: Request<Record<string, string>, object, SavePredictionRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.authUser!.role === 'super_admin') {
      res.status(403).json({ message: 'Super admin cannot submit predictions.' });
      return;
    }

    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await submitPrediction(req.authUser!.id, competitionId, Number(req.params['matchId']), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid scores.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Match could not be found.' });
      return;
    }

    if (result.status === 'locked') {
      res.status(409).json({ message: 'Predictions for this round are closed.' });
      return;
    }

    if (result.status === 'missing_tiebreaker') {
      res.status(409).json({ message: 'Choose your competition winner before saving first-round predictions.' });
      return;
    }

    res.json(result.prediction);
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
