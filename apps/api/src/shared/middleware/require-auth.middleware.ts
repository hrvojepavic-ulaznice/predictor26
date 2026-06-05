import { NextFunction, Request, Response } from 'express';

import { getUserById, UserRole } from '../../database/queries/users.queries.js';
import { verifyAuthToken } from '../utils/auth-token.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const user = await authenticateRequest(req, res, next);

    if (user) {
      next();
    }
  })();
}

export function requireRoles(allowedRoles: readonly UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authenticateRequest(req, res, next);

      if (!user) {
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: 'You do not have access to this resource.' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      res.status(401).json({ message: 'Authentication is required.' });
      return null;
    }

    const payload = verifyAuthToken(token);

    if (!payload) {
      res.status(401).json({ message: 'Authentication is required.' });
      return null;
    }

    const user = await getUserById(payload.userId);

    if (!user || user.username !== payload.username) {
      res.status(401).json({ message: 'Authentication is required.' });
      return null;
    }

    req.authUser = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return user;
  } catch (error) {
    next(error);
    return null;
  }
}

function readBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  return scheme === 'Bearer' && token ? token : null;
}
