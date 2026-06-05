import { Router } from 'express';

import { requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import { getAdminUsersController, updateUserRoleController } from './admin-users.controller.js';

export const adminUsersRoutes = Router();

adminUsersRoutes.use('/admin/users', requireRoles(['super_admin', 'admin']));
adminUsersRoutes.get('/admin/users', getAdminUsersController);
adminUsersRoutes.patch('/admin/users/:userId/role', updateUserRoleController);
