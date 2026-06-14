import { Router } from 'express';

import { requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminJobController,
  getAdminJobsController,
  runAdminJobController,
  updateAdminJobEnabledController
} from './admin-jobs.controller.js';

export const adminJobsRoutes = Router();

adminJobsRoutes.use('/admin/jobs', requireRoles(['super_admin', 'admin']));
adminJobsRoutes.get('/admin/jobs', getAdminJobsController);
adminJobsRoutes.get('/admin/jobs/:jobId', getAdminJobController);
adminJobsRoutes.patch('/admin/jobs/:jobId/enabled', updateAdminJobEnabledController);
adminJobsRoutes.post('/admin/jobs/:jobId/run', runAdminJobController);
