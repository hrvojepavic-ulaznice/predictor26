import { NextFunction, Request, Response } from 'express';

import {
  AdminActionSecretRequest,
  UpdateFinalScoreRequest,
  UpdateKickoffRequest,
  UpdatePlayoffMappingRequest
} from './admin-matches.interfaces.js';
import {
  changeFinalScore,
  changeKickoff,
  changePlayoffMapping,
  getAdminMatches,
  importSchedule,
  syncOdds
} from './admin-matches.service.js';
import { resolveCompetitionIdForAdmin } from '../competitions/competitions.service.js';

interface MatchIdParams {
  readonly matchId: string;
}

export async function getAdminMatchesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    res.json(await getAdminMatches(competitionId));
  } catch (error) {
    next(error);
  }
}

export async function importMatchesController(
  req: Request<object, object, AdminActionSecretRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await importSchedule(competitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Secret code is required.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json(result.response);
  } catch (error) {
    next(error);
  }
}

export async function syncMatchOddsController(
  req: Request<object, object, AdminActionSecretRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await syncOdds(competitionId, req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Secret code is required.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    res.json(result.response);
  } catch (error) {
    next(error);
  }
}

export async function updateFinalScoreController(
  req: Request<MatchIdParams, object, UpdateFinalScoreRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeFinalScore(competitionId, Number(req.params.matchId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter a valid final score.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Match could not be found.' });
      return;
    }

    res.json({
      match: result.match,
      finalScore: result.match.finalScore
    });
  } catch (error) {
    next(error);
  }
}

export async function updateKickoffController(
  req: Request<MatchIdParams, object, UpdateKickoffRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changeKickoff(competitionId, Number(req.params.matchId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please enter valid match details and secret code.' });
      return;
    }

    if (result.status === 'invalid_secret') {
      res.status(403).json({ message: 'Secret code is incorrect.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Match could not be found.' });
      return;
    }

    res.json({
      match: result.match
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePlayoffMappingController(
  req: Request<MatchIdParams, object, UpdatePlayoffMappingRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const competitionId = await resolveRequestedCompetitionId(req);

    if (competitionId === null) {
      res.status(403).json({ message: 'Competition access is required.' });
      return;
    }

    const result = await changePlayoffMapping(competitionId, Number(req.params.matchId), req.body);

    if (result.status === 'invalid') {
      res.status(400).json({ message: 'Please select a valid playoff team.' });
      return;
    }

    if (result.status === 'not_found') {
      res.status(404).json({ message: 'Match could not be found.' });
      return;
    }

    res.json({
      match: result.match
    });
  } catch (error) {
    next(error);
  }
}

async function resolveRequestedCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
