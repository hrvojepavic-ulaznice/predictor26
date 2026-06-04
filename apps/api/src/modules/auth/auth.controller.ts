import { NextFunction, Request, Response } from 'express';

import { LoginRequest } from './auth.interfaces.js';
import { login } from './auth.service.js';

export async function loginController(
  req: Request<object, object, LoginRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await login(req.body);

    if (!result) {
      res.status(401).json({ message: 'Invalid username or password.' });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}
