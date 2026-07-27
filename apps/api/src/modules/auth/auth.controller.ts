import { NextFunction, Request, Response } from 'express';

import { LoginRequest, RegisterRequest } from './auth.interfaces.js';
import { getCurrentUser, login, register } from './auth.service.js';
import { resolveCompetitionIdForViewer } from '../competitions/competitions.service.js';

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
      res.status(403).json({ message: 'Registrations are not possible.' });
      return;
    }

    res.status(201).json(result.session);
  } catch (error) {
    next(error);
  }
}

export async function currentUserController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authUser = _req.authUser;
    const userId = authUser?.id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    const competitionId = await resolveRequestedCompetitionId(_req);
    const user = await getCurrentUser(userId, authUser.role, competitionId);

    if (!user) {
      res.status(401).json({ message: 'Authentication is required.' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedCompetitionId(req: Request): Promise<number | null> {
  const userId = req.authUser?.id;
  const role = req.authUser?.role;
  const headerValue = req.header('x-competition-id');

  if (!userId || !role || !headerValue) {
    return null;
  }

  const requestedCompetitionId = Number(headerValue);

  if (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1) {
    return null;
  }

  return resolveCompetitionIdForViewer(userId, role, requestedCompetitionId);
}
