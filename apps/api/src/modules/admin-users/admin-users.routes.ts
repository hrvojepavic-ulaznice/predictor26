import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminUsersController,
  updateUsernameController,
  updateUserRoleController,
  updateUserVerificationController
} from './admin-users.controller.js';

export const adminUsersRoutes = Router();

adminUsersRoutes.use('/admin/users', requireAuth);
adminUsersRoutes.get('/admin/users', getAdminUsersController);
adminUsersRoutes.patch('/admin/users/:userId/role', updateUserRoleController);
adminUsersRoutes.patch('/admin/users/:userId/username', updateUsernameController);
adminUsersRoutes.patch('/admin/users/:userId/verification', updateUserVerificationController);
