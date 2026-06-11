import { NextFunction, Request, Response } from 'express';

import { SavePushSubscriptionRequest, UpdateNotificationSettingsRequest } from './notifications.interfaces.js';
import {
  getNotificationConfig,
  getNotificationSettings,
  resetUserNotificationSubscriptions,
  savePushSubscription,
  sendTestNotification,
  updateNotificationSettings
} from './notifications.service.js';

export async function getNotificationConfigController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getNotificationConfig());
  } catch (error) {
    next(error);
  }
}

export async function savePushSubscriptionController(
  req: Request<object, object, SavePushSubscriptionRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const saved = await savePushSubscription(req.authUser!.id, req.body, req.get('user-agent') ?? null);

    if (!saved) {
      res.status(400).json({ message: 'Invalid push subscription.' });
      return;
    }

    res.status(201).json({ subscribed: true });
  } catch (error) {
    next(error);
  }
}

export async function getNotificationSettingsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getNotificationSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateNotificationSettingsController(
  req: Request<object, object, UpdateNotificationSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await updateNotificationSettings(req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid notification settings.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json(result.settings);
  } catch (error) {
    next(error);
  }
}

export async function sendTestNotificationController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await sendTestNotification(req.authUser!.id));
  } catch (error) {
    next(error);
  }
}

export async function resetNotificationSubscriptionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(resetUserNotificationSubscriptions(req.authUser!.id));
  } catch (error) {
    next(error);
  }
}
