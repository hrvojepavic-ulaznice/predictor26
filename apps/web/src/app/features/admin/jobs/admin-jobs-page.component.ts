import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminNotificationReminderJob } from '@models/admin-job.models';
import { AdminJobsApiProvider } from '@services/providers/admin-jobs-api.provider';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';

@Component({
  selector: 'app-admin-jobs-page',
  imports: [DatePipe, DecimalPipe, ModalShellComponent, RouterLink, SecretCodeModalComponent],
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
  protected readonly secretCodeErrorMessage = signal<string | null>(null);
  protected readonly confirmingRun = signal(false);
  protected readonly intervalMinutes = computed(() => {
    const job = this.job();

    return job ? job.intervalMs / 60_000 : null;
  });

  constructor() {
    this.loadJob();
  }

  protected runNow(): void {
    if (this.running()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.confirmingRun.set(true);
  }

  protected cancelRunNow(): void {
    if (!this.running()) {
      this.confirmingRun.set(false);
      this.secretCodeErrorMessage.set(null);
    }
  }

  protected confirmRunNow(secretCode: string): void {
    if (this.running()) {
      return;
    }

    this.running.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.adminJobsApi.runJob(this.notificationReminderJobId, { secretCode }).subscribe({
      next: ({ job, run }) => {
        this.job.set(job);
        this.successMessage.set(`Reminder job finished. Sent ${run.sentCount}/${run.candidateCount} due reminders.`);
        this.confirmingRun.set(false);
        this.running.set(false);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Scheduled job could not be run.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.secretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.confirmingRun.set(false);
        }

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
