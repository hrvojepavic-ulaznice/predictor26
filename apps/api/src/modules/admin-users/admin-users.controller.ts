import { NextFunction, Request, Response } from 'express';

import {
  UpdateUsernameRequest,
  UpdateUserRoleRequest,
  UpdateUserVerificationRequest
} from './admin-users.interfaces.js';
import { changeUsername, changeUserRole, changeUserVerification, getAdminUsers } from './admin-users.service.js';

interface UserIdParams {
  readonly userId: string;
}

export async function getAdminUsersController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getAdminUsers());
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
    const result = await changeUserRole(Number(req.params.userId), req.body);

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
    const result = await changeUsername(Number(req.params.userId), req.body);

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
    const result = await changeUserVerification(Number(req.params.userId), req.body);

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
