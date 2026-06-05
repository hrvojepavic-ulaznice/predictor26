import { NextFunction, Request, Response } from 'express';

import { getUserById, UserRole } from '../../database/queries/users.queries.js';
import { verifyAuthToken } from '../utils/auth-token.js';

export function requireRoles(allowedRoles: readonly UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = readBearerToken(req);

      if (!token) {
        res.status(401).json({ message: 'Authentication is required.' });
        return;
      }

      const payload = verifyAuthToken(token);

      if (!payload) {
        res.status(401).json({ message: 'Authentication is required.' });
        return;
      }

      const user = await getUserById(payload.userId);

      if (!user || user.username !== payload.username) {
        res.status(401).json({ message: 'Authentication is required.' });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: 'You do not have access to this resource.' });
        return;
      }

      req.authUser = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  return scheme === 'Bearer' && token ? token : null;
}
