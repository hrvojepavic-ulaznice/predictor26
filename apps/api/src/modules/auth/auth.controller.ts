import { NextFunction, Request, Response } from 'express';

import { LoginRequest, RegisterRequest } from './auth.interfaces.js';
import { login, register } from './auth.service.js';

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

export async function registerController(
  req: Request<object, object, RegisterRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await register(req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please check the registration fields.' });
      return;
    }

    if (result.status === 'username_taken') {
      res.status(409).json({ message: 'Username is already taken.' });
      return;
    }

    if (result.status === 'registrations_disabled') {
      res.status(403).json({ message: 'Competition started and registrations are not possible.' });
      return;
    }

    res.status(201).json(result.session);
  } catch (error) {
    next(error);
  }
}
