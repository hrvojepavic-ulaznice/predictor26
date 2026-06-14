import { Request, Response } from 'express';

import { getAdminJob, getAdminJobs, runAdminJob } from './admin-jobs.service.js';

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

export async function runAdminJobController(req: Request<JobParams>, res: Response): Promise<void> {
  const result = await runAdminJob(req.params.jobId);

  if (!result) {
    res.status(404).json({ message: 'Scheduled job could not be found.' });
    return;
  }

  res.json(result);
}
