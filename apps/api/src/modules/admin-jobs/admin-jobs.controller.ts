import { Request, Response } from 'express';

import { RunAdminJobRequest, UpdateAdminJobEnabledRequest } from './admin-jobs.interfaces.js';
import { getAdminJob, getAdminJobs, runAdminJob, updateAdminJobEnabled } from './admin-jobs.service.js';
import { resolveCompetitionIdForAdmin } from '../competitions/competitions.service.js';

interface JobParams extends Record<string, string> {
  readonly jobId: string;
}

export async function getAdminJobsController(req: Request, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  res.json(await getAdminJobs(competitionId));
}

export async function getAdminJobController(req: Request<JobParams>, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  const result = await getAdminJob(competitionId, req.params.jobId);

  if (!result) {
    res.status(404).json({ message: 'Scheduled job could not be found.' });
    return;
  }

  res.json(result);
}

export async function runAdminJobController(req: Request<JobParams, object, RunAdminJobRequest>, res: Response): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  const result = await runAdminJob(competitionId, req.params.jobId, req.body);

  if (result.status === 'not_found') {
    res.status(404).json({ message: 'Scheduled job could not be found.' });
    return;
  }

  if (result.status === 'invalid') {
    res.status(400).json({ message: 'Please enter a valid secret code.' });
    return;
  }

  if (result.status === 'invalid_secret') {
    res.status(403).json({ message: 'Secret code is incorrect.' });
    return;
  }

  res.json(result.response);
}

export async function updateAdminJobEnabledController(
  req: Request<JobParams, object, UpdateAdminJobEnabledRequest>,
  res: Response
): Promise<void> {
  const competitionId = await resolveRequestedCompetitionId(req);

  if (competitionId === null) {
    res.status(403).json({ message: 'Competition access is required.' });
    return;
  }

  const result = await updateAdminJobEnabled(competitionId, req.params.jobId, req.body);

  if (result.status === 'not_found') {
    res.status(404).json({ message: 'Scheduled job could not be found.' });
    return;
  }

  if (result.status === 'invalid') {
    res.status(400).json({ message: 'Please enter a valid job setting and secret code.' });
    return;
  }

  if (result.status === 'invalid_secret') {
    res.status(403).json({ message: 'Secret code is incorrect.' });
    return;
  }

  res.json(result.response);
}

async function resolveRequestedCompetitionId(req: Pick<Request, 'header' | 'authUser'>): Promise<number | null> {
  const headerValue = req.header('x-competition-id');
  const requestedCompetitionId = headerValue ? Number(headerValue) : null;

  if (requestedCompetitionId !== null && (!Number.isInteger(requestedCompetitionId) || requestedCompetitionId < 1)) {
    return null;
  }

  return resolveCompetitionIdForAdmin(req.authUser!.id, req.authUser!.role, requestedCompetitionId);
}
