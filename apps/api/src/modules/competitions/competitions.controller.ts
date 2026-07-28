import { NextFunction, Request, Response } from 'express';

import {
  CreateAdminCompetitionRequest,
  JoinCompetitionRequest,
  UpdateAdminCompetitionSettingsRequest,
  UpdateCompetitionTiebreakerRequest
} from './competitions.interfaces.js';
import {
  createAdminCompetition,
  getAdminCompetitionSettings,
  getAdminRuleTemplates,
  getDefaultCompetitionRules,
  getCompetitionRulesForViewer,
  getCompetitionRulesForVisibleCompetition,
  getCompetitionTeamsForViewer,
  getCompetitionsForAdmin,
  getCompetitionsForUser,
  joinCompetition,
  resolveCompetitionIdForAdmin,
  updateAdminCompetitionSettings,
  updateTiebreakerForUser
} from './competitions.service.js';

export async function getCompetitionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getCompetitionsForUser(req.authUser!.id, req.authUser!.role));
  } catch (error) {
    next(error);
  }
}

export async function getAdminCompetitionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getCompetitionsForAdmin(req.authUser!.id, req.authUser!.role));
  } catch (error) {
    next(error);
  }
}

export async function createAdminCompetitionController(
  req: Request<object, object, CreateAdminCompetitionRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await createAdminCompetition(req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please check the competition details.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.status(201).json({ competition: result.competition });
  } catch (error) {
    next(error);
  }
}

export async function getAdminRuleTemplatesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getAdminRuleTemplates());
  } catch (error) {
    next(error);
  }
}

export async function getCompetitionRulesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const headerValue = req.header('x-competition-id');
    const requestedCompetitionId = headerValue ? Number(headerValue) : null;

    if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const rules = await getCompetitionRulesForViewer(req.authUser!.id, req.authUser!.role, requestedCompetitionId);

    if (!rules) {
      res.status(404).json({ message: 'Competition rules could not be found.' });
      return;
    }

    res.json(rules);
  } catch (error) {
    next(error);
  }
}

export async function getCompetitionTeamsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const headerValue = req.header('x-competition-id');
    const requestedCompetitionId = headerValue ? Number(headerValue) : null;

    if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const teams = await getCompetitionTeamsForViewer(req.authUser!.id, req.authUser!.role, requestedCompetitionId);

    if (!teams) {
      res.status(404).json({ message: 'Competition teams could not be found.' });
      return;
    }

    res.json(teams);
  } catch (error) {
    next(error);
  }
}

export async function getCompetitionRulesByIdController(
  req: Request<{ readonly competitionId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rules = await getCompetitionRulesForVisibleCompetition(
      req.authUser!.id,
      req.authUser!.role,
      Number(req.params.competitionId)
    );

    if (!rules) {
      res.status(404).json({ message: 'Competition rules could not be found.' });
      return;
    }

    res.json(rules);
  } catch (error) {
    next(error);
  }
}

export async function getDefaultCompetitionRulesController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await getDefaultCompetitionRules());
  } catch (error) {
    next(error);
  }
}

export async function joinCompetitionController(
  req: Request<{ readonly competitionId: string }, object, JoinCompetitionRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await joinCompetition(req.authUser!.id, req.authUser!.role, Number(req.params.competitionId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid competition passcode.' });
      return;
    }

    if (result.status === 'invalid_passcode') {
      res.status(403).json({ message: 'Competition passcode is incorrect.' });
      return;
    }

    if (result.status === 'finished') {
      res.status(409).json({ message: 'This competition has ended.' });
      return;
    }

    if (result.status === 'forbidden') {
      res.status(403).json({ message: 'Super admin cannot join competitions.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(result.response);
  } catch (error) {
    next(error);
  }
}

export async function updateCompetitionTiebreakerController(
  req: Request<object, object, UpdateCompetitionTiebreakerRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.authUser!.role === 'super_admin') {
      res.status(403).json({ message: 'Super admin cannot participate in competitions.' });
      return;
    }

    const headerValue = req.header('x-competition-id');
    const requestedCompetitionId = headerValue ? Number(headerValue) : null;
    const result = await updateTiebreakerForUser(req.authUser!.id, requestedCompetitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please choose a valid winner.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(result.response);
  } catch (error) {
    next(error);
  }
}

export async function getAdminCompetitionSettingsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedAdminCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const settings = await getAdminCompetitionSettings(competitionId);

    if (!settings) {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminCompetitionSettingsController(
  req: Request<object, object, UpdateAdminCompetitionSettingsRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedAdminCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await updateAdminCompetitionSettings(competitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid HTTPS source URL.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Competition could not be found.' });
      return;
    }

    res.json(result.settings);
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedAdminCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
