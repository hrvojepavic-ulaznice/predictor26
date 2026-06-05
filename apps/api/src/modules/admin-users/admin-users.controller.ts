import { NextFunction, Request, Response } from 'express';

import { UpdateUserRoleRequest } from './admin-users.interfaces.js';
import { changeUserRole, getAdminUsers } from './admin-users.service.js';

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

    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
}
