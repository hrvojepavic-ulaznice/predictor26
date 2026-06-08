import { NextFunction, Request, Response } from 'express';

import { getWorldCupTeams } from './world-cup-teams.service.js';

export function getWorldCupTeamsController(_req: Request, res: Response, next: NextFunction): void {
  try {
    res.json(getWorldCupTeams());
  } catch (error) {
    next(error);
  }
}
