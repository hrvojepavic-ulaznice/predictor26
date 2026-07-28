import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { FinalResultsService } from '@services/final-results.service';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TooltipComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  protected readonly appState = inject(AppStateService);
  protected readonly finalResults = inject(FinalResultsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  protected readonly routeCompetition = computed(() => {
    const competition = this.appState.activeCompetition();

    if (!competition) {
      return null;
    }

    const path = this.currentUrl().split('?')[0].split('#')[0];
    const competitionPath = `/competition/${competition.slug}`;

    return path === competitionPath || path.startsWith(`${competitionPath}/`) ? competition : null;
  });
  protected readonly brandRouterLink = computed(() => {
    const competition = this.routeCompetition();

    return competition ? ['/competition', competition.slug] : ['/'];
  });
  protected readonly brandState = computed(() => (this.routeCompetition() ? undefined : { showCompetitionList: true }));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }
}
