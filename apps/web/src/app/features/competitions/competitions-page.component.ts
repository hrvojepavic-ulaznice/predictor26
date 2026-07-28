import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { Competition } from '@models/competition.models';
import { CompetitionsService } from '@services/competitions.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';

@Component({
  selector: 'app-competitions-page',
  imports: [ModalShellComponent, SecretCodeModalComponent],
  templateUrl: './competitions-page.component.html',
  styleUrl: './competitions-page.component.scss'
})
export class CompetitionsPageComponent {
  private readonly appState = inject(AppStateService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly shouldAutoEnterSingleCompetition = shouldAutoEnterSingleCompetition(this.router);

  protected readonly competitions = this.competitionsService.competitions;
  protected readonly loaded = this.competitionsService.loaded;
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly joinCompetitionPrompt = signal<Competition | null>(null);
  protected readonly joinErrorMessage = signal<string | null>(null);
  protected readonly joiningCompetition = signal(false);

  constructor() {
    this.competitionsService.exitCompetition();
    this.competitionsService
      .refreshCompetitions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ competitions }) => {
          const activeCompetitions = competitions.filter((competition) => competition.isJoined && !competition.isFinished);

          if (this.shouldAutoEnterSingleCompetition && activeCompetitions.length === 1) {
            this.enterCompetition(activeCompetitions[0]);
          }
        },
        error: () => {
          this.errorMessage.set('Competitions could not be loaded.');
        }
      });
  }

  protected enterCompetition(competition: Competition): void {
    if (!this.appState.isLoggedIn()) {
      void this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/'
        }
      });
      return;
    }

    if (!competition.isJoined) {
      this.joinErrorMessage.set(null);
      this.joinCompetitionPrompt.set(competition);
      return;
    }

    this.competitionsService.enterCompetition(competition);
    void this.router.navigate(['/competition', competition.slug]);
  }

  protected cancelJoinCompetition(): void {
    if (!this.joiningCompetition()) {
      this.joinCompetitionPrompt.set(null);
      this.joinErrorMessage.set(null);
    }
  }

  protected confirmJoinCompetition(passcode: string): void {
    const competition = this.joinCompetitionPrompt();

    if (!competition || this.joiningCompetition()) {
      return;
    }

    this.joiningCompetition.set(true);
    this.joinErrorMessage.set(null);

    this.competitionsService.joinCompetition(competition, passcode).subscribe({
      next: ({ competition: joinedCompetition }) => {
        this.joiningCompetition.set(false);
        this.joinCompetitionPrompt.set(null);
        void this.router.navigate(['/competition', joinedCompetition.slug]);
      },
      error: (error: unknown) => {
        this.joinErrorMessage.set(
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Competition could not be joined.'
        );
        this.joiningCompetition.set(false);
      }
    });
  }
}

function shouldAutoEnterSingleCompetition(router: Router): boolean {
  const navigation = router.getCurrentNavigation();

  return Boolean(navigation && navigation.previousNavigation === null && navigation.extras.state?.['showCompetitionList'] !== true);
}
