import { Router } from 'express';

import { requireAuth, requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  createAdminCompetitionController,
  getAdminCompetitionSettingsController,
  getAdminCompetitionsController,
  getAdminRuleTemplatesController,
  getCompetitionRulesByIdController,
  getCompetitionRulesController,
  getCompetitionTeamsController,
  getCompetitionsController,
  getDefaultCompetitionRulesController,
  joinCompetitionController,
  updateAdminCompetitionSettingsController,
  updateCompetitionTiebreakerController
} from './competitions.controller.js';

export const competitionsRoutes = Router();

competitionsRoutes.get('/competitions', requireAuth, getCompetitionsController);
competitionsRoutes.get('/competitions/default/rules', getDefaultCompetitionRulesController);
competitionsRoutes.get('/competitions/current/rules', requireAuth, getCompetitionRulesController);
competitionsRoutes.get('/competitions/current/teams', requireAuth, getCompetitionTeamsController);
competitionsRoutes.get('/competitions/:competitionId/rules', requireAuth, getCompetitionRulesByIdController);
competitionsRoutes.post('/competitions/:competitionId/join', requireAuth, joinCompetitionController);
competitionsRoutes.put('/competitions/current/tiebreaker', requireAuth, updateCompetitionTiebreakerController);
competitionsRoutes.get('/admin/competitions', requireAuth, getAdminCompetitionsController);
competitionsRoutes.post('/admin/competitions', requireRoles(['super_admin']), createAdminCompetitionController);
competitionsRoutes.get('/admin/rule-templates', requireAuth, getAdminRuleTemplatesController);
competitionsRoutes.get(
  '/admin/competitions/current/settings',
  requireAuth,
  getAdminCompetitionSettingsController
);
competitionsRoutes.patch(
  '/admin/competitions/current/settings',
  requireAuth,
  updateAdminCompetitionSettingsController
);
