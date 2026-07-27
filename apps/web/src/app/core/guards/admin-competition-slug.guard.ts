import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { CompetitionsService } from '@services/competitions.service';

export const adminCompetitionSlugGuard: CanActivateFn = (route) => {
  const appState = inject(AppStateService);
  const competitionsService = inject(CompetitionsService);
  const router = inject(Router);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return router.createUrlTree(['/admin']);
  }

  const activeCompetition = appState.activeCompetition();

  if (activeCompetition?.slug === slug) {
    return true;
  }

  return competitionsService.refreshAdminCompetitions().pipe(
    map(({ competitions }) => {
      const competition = competitions.find((currentCompetition) => currentCompetition.slug === slug);

      if (!competition) {
        return router.createUrlTree(['/admin']);
      }

      competitionsService.enterCompetition(competition);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/admin'])))
  );
};
