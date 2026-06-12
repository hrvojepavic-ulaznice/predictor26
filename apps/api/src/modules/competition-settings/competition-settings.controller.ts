import { NextFunction, Request, Response } from 'express';

import { UpdateCompetitionSettingsRequest } from './competition-settings.interfaces.js';
import { getCompetitionSettings, updateCompetitionSettings } from './competition-settings.service.js';

export async function getCompetitionSettingsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getCompetitionSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateCompetitionSettingsController(
  req: Request<object, object, UpdateCompetitionSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await updateCompetitionSettings(req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please check the competition settings.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is not valid.' });
      return;
    }

    res.json(result.settings);
  } catch (error) {
    next(error);
  }
}
