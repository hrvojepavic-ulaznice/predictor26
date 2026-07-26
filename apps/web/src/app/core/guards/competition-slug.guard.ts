import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AppStateService } from '@core/state/app-state.service';
import { CompetitionsService } from '@services/competitions.service';

export const competitionSlugGuard: CanActivateFn = (route) => {
  const appState = inject(AppStateService);
  const competitionsService = inject(CompetitionsService);
  const router = inject(Router);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    return router.createUrlTree(['/competitions']);
  }

  const activeCompetition = appState.activeCompetition();

  if (activeCompetition?.slug === slug) {
    return true;
  }

  return competitionsService.refreshCompetitions().pipe(
    map(({ competitions }) => {
      const competition = competitions.find((currentCompetition) => currentCompetition.slug === slug);

      if (!competition) {
        return router.createUrlTree(['/competitions']);
      }

      competitionsService.enterCompetition(competition);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/competitions'])))
  );
};
