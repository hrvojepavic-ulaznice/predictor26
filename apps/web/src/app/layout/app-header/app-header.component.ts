import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppStateService } from '@core/state/app-state.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  protected readonly appState = inject(AppStateService);

  protected logout(): void {
    this.appState.clearSession();
  }
}
