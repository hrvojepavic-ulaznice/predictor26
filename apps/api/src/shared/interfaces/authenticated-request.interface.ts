import { Request } from 'express';

import { UserRole } from '../../database/queries/users.queries.js';

export interface AuthenticatedUser {
  readonly id: number;
  readonly username: string;
  readonly role: UserRole;
}

export interface AuthenticatedRequest<
  Params = object,
  ResponseBody = unknown,
  RequestBody = unknown,
  Query = object
> extends Request<Params, ResponseBody, RequestBody, Query> {
  authUser: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}
