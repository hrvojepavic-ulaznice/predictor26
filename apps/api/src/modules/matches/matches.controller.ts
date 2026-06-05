import { NextFunction, Request, Response } from 'express';

import { SavePredictionRequest } from './matches.interfaces.js';
import { getMatchesForUser, submitPrediction } from './matches.service.js';

export async function getMatchesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json(await getMatchesForUser(req.authUser!.id));
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
    const result = await submitPrediction(req.authUser!.id, Number(req.params['matchId']), req.body);

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

    res.json(result.prediction);
  } catch (error) {
    next(error);
  }
}
