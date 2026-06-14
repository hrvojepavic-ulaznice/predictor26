import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { AdminJobDetailsResponse, AdminJobsResponse, RunAdminJobResponse } from '@models/admin-job.models';

@Injectable({
  providedIn: 'root'
})
export class AdminJobsApiProvider {
  private readonly http = inject(HttpClient);

  getJobs() {
    return this.http.get<AdminJobsResponse>('/api/admin/jobs');
  }

  getJob(jobId: string) {
    return this.http.get<AdminJobDetailsResponse>(`/api/admin/jobs/${encodeURIComponent(jobId)}`);
  }

  runJob(jobId: string) {
    return this.http.post<RunAdminJobResponse>(`/api/admin/jobs/${encodeURIComponent(jobId)}/run`, {});
  }
}
