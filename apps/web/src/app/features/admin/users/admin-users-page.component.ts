import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminUser } from '@models/admin-user.models';
import { AdminUsersApiProvider } from '@services/providers/admin-users-api.provider';
import { AppStateService } from '@core/state/app-state.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [RouterLink],
  templateUrl: './admin-users-page.component.html',
  styleUrl: './admin-users-page.component.scss'
})
export class AdminUsersPageComponent {
  private readonly adminUsersApi = inject(AdminUsersApiProvider);
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly updatingUserIds = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly adminCount = computed(
    () => this.users().filter((user) => user.role === 'admin' || user.role === 'super_admin').length
  );

  constructor() {
    this.loadUsers();
  }

  protected toggleAdmin(user: AdminUser): void {
    if (user.role === 'super_admin' || this.updatingUserIds().has(user.id)) {
      return;
    }

    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    this.setUpdating(user.id, true);
    this.errorMessage.set(null);

    this.adminUsersApi.updateUserRole(user.id, { role: nextRole }).subscribe({
      next: ({ user: updatedUser }) => {
        this.users.update((users) =>
          users.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
        );
        this.appState.updateCurrentUser(updatedUser);
        this.setUpdating(user.id, false);

        if (this.appState.currentUser()?.role === 'user') {
          void this.router.navigateByUrl('/');
        }
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 403
            ? 'You do not have permission to change that role.'
            : 'Role update failed. Please try again.'
        );
        this.setUpdating(user.id, false);
      }
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.adminUsersApi.getUsers().subscribe({
      next: ({ users }) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Users could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private setUpdating(userId: number, updating: boolean): void {
    this.updatingUserIds.update((userIds) => {
      const nextUserIds = new Set(userIds);

      if (updating) {
        nextUserIds.add(userId);
      } else {
        nextUserIds.delete(userId);
      }

      return nextUserIds;
    });
  }
}
