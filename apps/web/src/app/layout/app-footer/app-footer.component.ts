import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { CompetitionsService } from '@services/competitions.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  protected readonly appState = inject(AppStateService);
  private readonly competitionsService = inject(CompetitionsService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.competitionsService.clearCompetitions();
    this.appState.clearSession();
    void this.router.navigateByUrl('/login');
  }
}
