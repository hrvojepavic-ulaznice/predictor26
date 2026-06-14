import { Request, Response } from 'express';

import { RunAdminJobRequest, UpdateAdminJobEnabledRequest } from './admin-jobs.interfaces.js';
import { getAdminJob, getAdminJobs, runAdminJob, updateAdminJobEnabled } from './admin-jobs.service.js';

interface JobParams extends Record<string, string> {
  readonly jobId: string;
}

export async function getAdminJobsController(_req: Request, res: Response): Promise<void> {
  res.json(await getAdminJobs());
}

export async function getAdminJobController(req: Request<JobParams>, res: Response): Promise<void> {
  const result = await getAdminJob(req.params.jobId);

  if (!result) {
    res.status(404).json({ message: 'Scheduled job could not be found.' });
    return;
  }

  res.json(result);
}

export async function runAdminJobController(req: Request<JobParams, object, RunAdminJobRequest>, res: Response): Promise<void> {
  const result = await runAdminJob(req.params.jobId, req.body);

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
  const result = await updateAdminJobEnabled(req.params.jobId, req.body);

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
