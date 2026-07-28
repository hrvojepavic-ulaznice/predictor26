import { Router } from 'express';

import { requireAuth } from '../../shared/middleware/require-auth.middleware.js';
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
notificationsRoutes.get('/admin/notifications/settings', requireAuth, getNotificationSettingsController);
notificationsRoutes.patch('/admin/notifications/settings', requireAuth, updateNotificationSettingsController);
notificationsRoutes.post('/admin/notifications/reset-subscriptions', requireAuth, resetNotificationSubscriptionsController);
notificationsRoutes.post('/admin/notifications/test', requireAuth, sendTestNotificationController);
