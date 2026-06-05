import { NextFunction, Request, Response } from 'express';

import { UpdateFinalScoreRequest } from './admin-matches.interfaces.js';
import { changeFinalScore, getAdminMatches, importSchedule } from './admin-matches.service.js';

interface MatchIdParams {
  readonly matchId: string;
}

export async function getAdminMatchesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getAdminMatches());
  } catch (error) {
    next(error);
  }
}

export async function importMatchesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await importSchedule());
  } catch (error) {
    next(error);
  }
}

export async function updateFinalScoreController(
  req: Request<MatchIdParams, object, UpdateFinalScoreRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await changeFinalScore(Number(req.params.matchId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid final score.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Match could not be found.' });
      return;
    }

    res.json({
      match: result.match,
      finalScore: result.match.finalScore
    });
  } catch (error) {
    next(error);
  }
}
