import { Router } from 'express';

import { requireAuth, requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  getAdminCompetitionSettingsController,
  getAdminCompetitionsController,
  getCompetitionsController,
  updateAdminCompetitionSettingsController,
  updateCompetitionTiebreakerController
} from './competitions.controller.js';

export const competitionsRoutes = Router();

competitionsRoutes.get('/competitions', requireAuth, getCompetitionsController);
competitionsRoutes.put('/competitions/current/tiebreaker', requireAuth, updateCompetitionTiebreakerController);
competitionsRoutes.get('/admin/competitions', requireRoles(['super_admin', 'admin']), getAdminCompetitionsController);
competitionsRoutes.get(
  '/admin/competitions/current/settings',
  requireRoles(['super_admin', 'admin']),
  getAdminCompetitionSettingsController
);
competitionsRoutes.patch(
  '/admin/competitions/current/settings',
  requireRoles(['super_admin', 'admin']),
  updateAdminCompetitionSettingsController
);
