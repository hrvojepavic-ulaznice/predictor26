import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly apiStatus = signal('checking');
  protected readonly databaseStatus = signal('unknown');

  constructor() {
    this.http
      .get<{ status: string; database: { connected: boolean; schemaVersion: string } }>('/api/health')
      .subscribe({
        next: (health) => {
          this.apiStatus.set(health.status);
          this.databaseStatus.set(
            health.database.connected ? `SQLite schema ${health.database.schemaVersion}` : 'offline'
          );
        },
        error: () => {
          this.apiStatus.set('offline');
          this.databaseStatus.set('unknown');
        }
      });
  }
}
