import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppHeaderComponent } from './layout/app-header/app-header.component';
import { AppFooterComponent } from './layout/app-footer/app-footer.component';

@Component({
  selector: 'app-root',
  imports: [AppHeaderComponent, AppFooterComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly routeActivated = signal(false);
}
