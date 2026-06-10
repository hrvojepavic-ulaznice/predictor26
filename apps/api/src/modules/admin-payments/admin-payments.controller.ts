import { NextFunction, Request, Response } from 'express';

import { UpdateAdminPaymentSettingsRequest } from './admin-payments.interfaces.js';
import { changeAdminPaymentSettings, getAdminPaymentSettings } from './admin-payments.service.js';

export async function getAdminPaymentSettingsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json(await getAdminPaymentSettings());
  } catch (error) {
    next(error);
  }
}

export async function updateAdminPaymentSettingsController(
  req: Request<object, object, UpdateAdminPaymentSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await changeAdminPaymentSettings(req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid payment settings.' });
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
