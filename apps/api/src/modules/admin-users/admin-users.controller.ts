import { NextFunction, Request, Response } from 'express';

import {
  UpdateUsernameRequest,
  UpdateUserRoleRequest,
  UpdateUserVerificationRequest
} from './admin-users.interfaces.js';
import {
  changeUsername,
  changeUserRole,
  changeUserVerification,
  getAdminUsersForCompetition
} from './admin-users.service.js';
import { resolveCompetitionIdForAdmin } from '../competitions/competitions.service.js';

interface UserIdParams {
  readonly userId: string;
}

export async function getAdminUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getAdminUsersForCompetition(competitionId));
  } catch (error) {
    next(error);
  }
}

export async function updateUserRoleController(
  req: Request<UserIdParams, object, UpdateUserRoleRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeUserRole(competitionId, Number(req.params.userId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please choose a valid role.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'User could not be found.' });
      return;
    }

    if (result.status === 'protected_role') {
      res.status(403).json({ message: 'Super admin role cannot be changed.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
}

export async function updateUsernameController(
  req: Request<UserIdParams, object, UpdateUsernameRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeUsername(competitionId, Number(req.params.userId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid username.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'User could not be found.' });
      return;
    }

    if (result.status === 'protected_role') {
      res.status(403).json({ message: 'Super admin cannot be edited.' });
      return;
    }

    if (result.status === 'username_taken') {
      res.status(409).json({ message: 'Username is already taken.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
}

export async function updateUserVerificationController(
  req: Request<UserIdParams, object, UpdateUserVerificationRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeUserVerification(competitionId, Number(req.params.userId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please choose a valid verification state.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'User could not be found.' });
      return;
    }

    if (result.status === 'protected_role') {
      res.status(403).json({ message: 'Super admin cannot be edited.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
