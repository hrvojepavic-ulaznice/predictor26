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
import { resolveCompetitionIdForAdmin, resolveCompetitionIdForViewer } from '../competitions/competitions.service.js';

export async function getNotificationConfigController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionIdForUser(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getNotificationConfig(competitionId));
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

export async function getNotificationSettingsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionIdForAdmin(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getNotificationSettings(competitionId));
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
    const competitionId = await resolveRequestedCompetitionIdForAdmin(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await updateNotificationSettings(competitionId, req.body);

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

async function resolveRequestedCompetitionIdForUser(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const requestedCompetitionId = readCompetitionHeader(req);

  if (requestedCompetitionId === undefined) {
    return null;
  }

  return resolveCompetitionIdForViewer(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}

async function resolveRequestedCompetitionIdForAdmin(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const requestedCompetitionId = readCompetitionHeader(req);

  if (requestedCompetitionId === undefined) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}

function readCompetitionHeader(req: Pick<Request, 'header'>): number | null | undefined {
  const headerValue = req.header('x-competition-id');

  if (!headerValue) {
    return null;
  }

  const competitionId = Number(headerValue);
  return Number.isInteger(competitionId) && competitionId > 0 ? competitionId : undefined;
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
