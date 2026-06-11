import { Router } from 'express';

import { requireAuth, requireRoles } from '../../shared/middleware/require-auth.middleware.js';
import {
  getNotificationConfigController,
  getNotificationSettingsController,
  resetNotificationSubscriptionsController,
  savePushSubscriptionController,
  sendTestNotificationController,
  updateNotificationSettingsController
} from './notifications.controller.js';

export const notificationsRoutes = Router();

notificationsRoutes.get('/notifications/config', requireAuth, getNotificationConfigController);
notificationsRoutes.post('/notifications/subscriptions', requireAuth, savePushSubscriptionController);
notificationsRoutes.get('/admin/notifications/settings', requireRoles(['super_admin', 'admin']), getNotificationSettingsController);
notificationsRoutes.patch('/admin/notifications/settings', requireRoles(['super_admin', 'admin']), updateNotificationSettingsController);
notificationsRoutes.post('/admin/notifications/reset-subscriptions', requireRoles(['super_admin', 'admin']), resetNotificationSubscriptionsController);
notificationsRoutes.post('/admin/notifications/test', requireRoles(['super_admin', 'admin']), sendTestNotificationController);
