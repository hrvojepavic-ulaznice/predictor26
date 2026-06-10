import { Request, Response, NextFunction } from 'express';

import { getPaymentInfoForUser } from './payments.service.js';

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

    res.json(await getPaymentInfoForUser(req.authUser.id));
  } catch (error) {
    next(error);
  }
}
