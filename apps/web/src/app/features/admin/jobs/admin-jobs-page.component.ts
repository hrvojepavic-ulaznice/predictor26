import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminAutoMatchImportJob, AdminJob, AdminLiveScoreJob, AdminNotificationReminderJob } from '@models/admin-job.models';
import { AdminJobsApiProvider } from '@services/providers/admin-jobs-api.provider';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';

type LiveScoreJobView = Omit<AdminLiveScoreJob, 'recentRuns' | 'recentUpdates'> & {
  readonly recentRuns: Array<AdminLiveScoreJob['recentRuns'][number] & { readonly rowColor: string | null }>;
  readonly recentUpdates: Array<AdminLiveScoreJob['recentUpdates'][number] & { readonly rowColor: string | null }>;
};

const liveScoreRunColors = ['#eff6ff', '#f0fdf4', '#fff7ed', '#fdf2f8', '#f5f3ff', '#ecfeff'];

@Component({
  selector: 'app-admin-jobs-page',
  imports: [DatePipe, DecimalPipe, ModalShellComponent, ReactiveFormsModule, RouterLink, SecretCodeModalComponent],
  templateUrl: './admin-jobs-page.component.html',
  styleUrl: './admin-jobs-page.component.scss'
})
export class AdminJobsPageComponent {
  private readonly adminJobsApi = inject(AdminJobsApiProvider);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notificationReminderJobId = 'prediction-reminders' as const;
  private readonly liveScoreJobId = 'live-score-sync' as const;
  private readonly autoMatchImportJobId = 'auto-match-import' as const;
  protected readonly adminTimeZone = 'Europe/Zagreb';

  protected readonly loading = signal(true);
  protected readonly runningJobId = signal<string | null>(null);
  protected readonly jobs = signal<AdminJob[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly secretCodeErrorMessage = signal<string | null>(null);
  protected readonly confirmingRunJobId = signal<string | null>(null);
  protected readonly confirmingToggleJob = signal<{ readonly jobId: string; readonly enabled: boolean } | null>(null);
  protected readonly confirmingAutoImportSettings = signal(false);
  protected readonly notificationJob = computed(() => this.jobs().find(isNotificationJob) ?? null);
  protected readonly liveScoreJob = computed(() => this.jobs().find(isLiveScoreJob) ?? null);
  protected readonly autoMatchImportJob = computed(() => this.jobs().find(isAutoMatchImportJob) ?? null);
  protected readonly autoImportForm = this.formBuilder.nonNullable.group({
    enabled: [false],
    weekday: [2, [Validators.required]],
    time: ['08:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    timeZone: ['Europe/Zagreb', [Validators.required, Validators.maxLength(80)]]
  });
  protected readonly liveScoreJobView = computed<LiveScoreJobView | null>(() => {
    const job = this.liveScoreJob();

    if (!job) {
      return null;
    }

    const updateRunIds = new Set<number>();

    for (const update of job.recentUpdates) {
      if (update.runId !== null) {
        updateRunIds.add(update.runId);
      }
    }

    const colorByRunId = new Map<number, string>();

    for (const run of job.recentRuns) {
      if (run.runId === null || !updateRunIds.has(run.runId)) {
        continue;
      }

      colorByRunId.set(run.runId, liveScoreRunColors[colorByRunId.size % liveScoreRunColors.length]);
    }

    for (const update of job.recentUpdates) {
      if (update.runId === null || colorByRunId.has(update.runId)) {
        continue;
      }

      colorByRunId.set(update.runId, liveScoreRunColors[colorByRunId.size % liveScoreRunColors.length]);
    }

    return {
      ...job,
      recentRuns: job.recentRuns.map((run) => ({
        ...run,
        rowColor: run.runId === null ? null : colorByRunId.get(run.runId) ?? null
      })),
      recentUpdates: job.recentUpdates.map((update) => ({
        ...update,
        rowColor: update.runId === null ? null : colorByRunId.get(update.runId) ?? null
      }))
    };
  });
  protected readonly notificationIntervalMinutes = computed(() => {
    const job = this.notificationJob();

    return job ? job.intervalMs / 60_000 : null;
  });
  protected readonly liveScoreIntervalMinutes = computed(() => {
    const job = this.liveScoreJob();

    return job ? job.intervalMs / 60_000 : null;
  });

  protected readonly autoImportWeekdayLabel = computed(() => weekdayLabel(this.autoMatchImportJob()?.weekday ?? 2));

  constructor() {
    this.loadJob();
  }

  protected runNow(jobId: string): void {
    if (this.runningJobId()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.confirmingRunJobId.set(jobId);
  }

  protected cancelRunNow(): void {
    if (!this.runningJobId()) {
      this.confirmingRunJobId.set(null);
      this.confirmingToggleJob.set(null);
      this.confirmingAutoImportSettings.set(false);
      this.secretCodeErrorMessage.set(null);
    }
  }

  protected saveAutoImportSettings(): void {
    if (this.runningJobId() || this.autoImportForm.invalid) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.confirmingAutoImportSettings.set(true);
  }

  protected toggleJobEnabled(jobId: string, enabled: boolean): void {
    if (this.runningJobId()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.confirmingToggleJob.set({ jobId, enabled });
  }

  protected confirmRunNow(secretCode: string): void {
    const jobId = this.confirmingRunJobId();

    if (this.runningJobId() || !jobId) {
      return;
    }

    this.runningJobId.set(jobId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.adminJobsApi.runJob(jobId, { secretCode }).subscribe({
      next: ({ job, run }) => {
        this.upsertJob(job);
        this.successMessage.set(this.getRunSuccessMessage(job, run));
        this.confirmingRunJobId.set(null);
        this.runningJobId.set(null);
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
          this.confirmingRunJobId.set(null);
        }

        this.runningJobId.set(null);
      }
    });
  }

  protected confirmToggle(secretCode: string): void {
    const toggle = this.confirmingToggleJob();

    if (this.runningJobId() || !toggle) {
      return;
    }

    this.runningJobId.set(toggle.jobId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.adminJobsApi.updateJobEnabled(toggle.jobId, { enabled: toggle.enabled, secretCode }).subscribe({
      next: ({ job }) => {
        this.upsertJob(job);
        this.successMessage.set(`${job.name} ${job.enabled ? 'enabled' : 'disabled'}.`);
        this.confirmingToggleJob.set(null);
        this.runningJobId.set(null);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Scheduled job setting could not be updated.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.secretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.confirmingToggleJob.set(null);
        }

        this.runningJobId.set(null);
      }
    });
  }

  protected confirmAutoImportSettings(secretCode: string): void {
    if (this.runningJobId() || this.autoImportForm.invalid) {
      return;
    }

    this.runningJobId.set(this.autoMatchImportJobId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.adminJobsApi.updateAutoMatchImportJob(this.autoMatchImportJobId, { ...this.autoImportForm.getRawValue(), secretCode }).subscribe({
      next: ({ job }) => {
        this.upsertJob(job);
        this.patchAutoImportForm(job);
        this.successMessage.set(`${job.name} settings saved.`);
        this.confirmingAutoImportSettings.set(false);
        this.runningJobId.set(null);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Auto import settings could not be saved.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.secretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.confirmingAutoImportSettings.set(false);
        }

        this.runningJobId.set(null);
      }
    });
  }

  private loadJob(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin([
      this.adminJobsApi.getJob(this.notificationReminderJobId),
      this.adminJobsApi.getJob(this.liveScoreJobId),
      this.adminJobsApi.getJob(this.autoMatchImportJobId)
    ]).subscribe({
      next: ([notificationResponse, liveScoreResponse, autoImportResponse]) => {
        this.jobs.set([notificationResponse.job, liveScoreResponse.job, autoImportResponse.job]);
        this.patchAutoImportForm(autoImportResponse.job);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Scheduled job details could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private upsertJob(job: AdminJob): void {
    this.jobs.update((jobs) => {
      const nextJobs = jobs.filter((currentJob) => currentJob.id !== job.id);
      return [...nextJobs, job].sort((firstJob, secondJob) => firstJob.name.localeCompare(secondJob.name));
    });
  }

  private getRunSuccessMessage(job: AdminJob, run: unknown): string {
    if (isNotificationJob(job) && isNotificationRun(run)) {
      return `Reminder job finished. Sent ${run.sentCount}/${run.candidateCount} due reminders.`;
    }

    if (isLiveScoreJob(job) && isLiveScoreRun(run)) {
      return `Live score sync finished. Checked ${run.checkedMatches}, updated ${run.updatedMatches}.`;
    }

    if (isAutoMatchImportJob(job) && isAutoMatchImportRun(run)) {
      return `Match import finished with ${run.status}. Imported ${run.imported}, synced odds for ${run.oddsSynced}.`;
    }

    return 'Scheduled job finished.';
  }

  private patchAutoImportForm(job: AdminJob): void {
    if (!isAutoMatchImportJob(job)) {
      return;
    }

    this.autoImportForm.patchValue({
      enabled: job.enabled,
      weekday: job.weekday,
      time: job.time,
      timeZone: job.timeZone
    });
  }
}

function isNotificationJob(job: AdminJob): job is AdminNotificationReminderJob {
  return job.id === 'prediction-reminders';
}

function isLiveScoreJob(job: AdminJob): job is AdminLiveScoreJob {
  return job.id === 'live-score-sync';
}

function isAutoMatchImportJob(job: AdminJob): job is AdminAutoMatchImportJob {
  return job.id === 'auto-match-import';
}

function isNotificationRun(run: unknown): run is AdminNotificationReminderJob['lastRun'] & object {
  return typeof run === 'object' && run !== null && 'sentCount' in run && 'candidateCount' in run;
}

function isLiveScoreRun(run: unknown): run is AdminLiveScoreJob['lastRun'] & object {
  return typeof run === 'object' && run !== null && 'checkedMatches' in run && 'updatedMatches' in run;
}

function isAutoMatchImportRun(run: unknown): run is AdminAutoMatchImportJob['lastRun'] & object {
  return typeof run === 'object' && run !== null && 'imported' in run && 'oddsSynced' in run;
}

function weekdayLabel(weekday: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday] ?? 'Tuesday';
}
