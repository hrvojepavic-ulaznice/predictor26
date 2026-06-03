import { NextFunction, Request, Response } from 'express';

import { getHealth } from './health.service.js';

export async function healthController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getHealth());
  } catch (error) {
    next(error);
  }
}
