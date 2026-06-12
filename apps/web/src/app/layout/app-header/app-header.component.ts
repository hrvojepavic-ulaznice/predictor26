import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';
import { TooltipComponent } from '@shared/components/tooltip/tooltip.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TooltipComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  protected readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.appState.clearSession();
    void this.router.navigateByUrl('/');
  }
}
