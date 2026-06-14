import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminNotificationReminderJob } from '@models/admin-job.models';
import { AdminJobsApiProvider } from '@services/providers/admin-jobs-api.provider';

@Component({
  selector: 'app-admin-jobs-page',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './admin-jobs-page.component.html',
  styleUrl: './admin-jobs-page.component.scss'
})
export class AdminJobsPageComponent {
  private readonly adminJobsApi = inject(AdminJobsApiProvider);
  private readonly notificationReminderJobId = 'prediction-reminders';

  protected readonly loading = signal(true);
  protected readonly running = signal(false);
  protected readonly job = signal<AdminNotificationReminderJob | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly intervalMinutes = computed(() => {
    const job = this.job();

    return job ? job.intervalMs / 60_000 : null;
  });

  constructor() {
    this.loadJob();
  }

  protected refresh(): void {
    this.loadJob();
  }

  protected runNow(): void {
    if (this.running()) {
      return;
    }

    this.running.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.adminJobsApi.runJob(this.notificationReminderJobId).subscribe({
      next: ({ job, run }) => {
        this.job.set(job);
        this.successMessage.set(`Reminder job finished. Sent ${run.sentCount}/${run.candidateCount} due reminders.`);
        this.running.set(false);
      },
      error: () => {
        this.errorMessage.set('Scheduled job could not be run.');
        this.running.set(false);
      }
    });
  }

  private loadJob(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.adminJobsApi.getJob(this.notificationReminderJobId).subscribe({
      next: ({ job }) => {
        this.job.set(job);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Scheduled job details could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
