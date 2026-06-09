import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AdminUser } from '@models/admin-user.models';
import { AdminUsersApiProvider } from '@services/providers/admin-users-api.provider';
import { AppStateService } from '@core/state/app-state.service';
import { ModalShellComponent } from '@shared/components/modal-shell/modal-shell.component';
import { SecretCodeModalComponent } from '@shared/components/secret-code-modal/secret-code-modal.component';
import { AdminUsernameModalComponent, UsernameChangeConfirmation } from './admin-username-modal.component';

interface PendingRoleChange {
  readonly user: AdminUser;
  readonly nextRole: 'admin' | 'user';
}

@Component({
  selector: 'app-admin-users-page',
  imports: [RouterLink, AdminUsernameModalComponent, ModalShellComponent, SecretCodeModalComponent],
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
  protected readonly secretCodeErrorMessage = signal<string | null>(null);
  protected readonly usernameErrorMessage = signal<string | null>(null);
  protected readonly pendingRoleChange = signal<PendingRoleChange | null>(null);
  protected readonly pendingUsernameChange = signal<AdminUser | null>(null);
  protected readonly updatingUserIds = signal<ReadonlySet<number>>(new Set<number>());

  constructor() {
    this.loadUsers();
  }

  protected toggleAdmin(user: AdminUser): void {
    if (user.role === 'super_admin' || this.updatingUserIds().has(user.id)) {
      return;
    }

    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    this.errorMessage.set(null);
    this.secretCodeErrorMessage.set(null);
    this.pendingRoleChange.set({ user, nextRole });
  }

  protected editUsername(user: AdminUser): void {
    if (user.role === 'super_admin' || this.updatingUserIds().has(user.id)) {
      return;
    }

    this.errorMessage.set(null);
    this.usernameErrorMessage.set(null);
    this.pendingUsernameChange.set(user);
  }

  protected cancelRoleChange(): void {
    if (this.pendingRoleChange() && !this.isPendingRoleChangeSubmitting()) {
      this.pendingRoleChange.set(null);
      this.secretCodeErrorMessage.set(null);
    }
  }

  protected confirmRoleChange(secretCode: string): void {
    const pendingRoleChange = this.pendingRoleChange();

    if (!pendingRoleChange || this.updatingUserIds().has(pendingRoleChange.user.id)) {
      return;
    }

    const { user, nextRole } = pendingRoleChange;
    this.setUpdating(user.id, true);
    this.errorMessage.set(null);
    this.secretCodeErrorMessage.set(null);

    this.adminUsersApi.updateUserRole(user.id, { role: nextRole, secretCode }).subscribe({
      next: ({ user: updatedUser }) => {
        this.users.update((users) =>
          users.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
        );
        this.appState.updateCurrentUser(updatedUser);
        this.pendingRoleChange.set(null);
        this.setUpdating(user.id, false);

        if (this.appState.currentUser()?.role === 'user') {
          void this.router.navigateByUrl('/');
        }
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Role update failed. Please try again.';

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.secretCodeErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.pendingRoleChange.set(null);
        }

        this.setUpdating(user.id, false);
      }
    });
  }

  protected isPendingRoleChangeSubmitting(): boolean {
    const pendingRoleChange = this.pendingRoleChange();

    return pendingRoleChange ? this.updatingUserIds().has(pendingRoleChange.user.id) : false;
  }

  protected cancelUsernameChange(): void {
    if (this.pendingUsernameChange() && !this.isPendingUsernameChangeSubmitting()) {
      this.pendingUsernameChange.set(null);
      this.usernameErrorMessage.set(null);
    }
  }

  protected confirmUsernameChange(confirmation: UsernameChangeConfirmation): void {
    const user = this.pendingUsernameChange();

    if (!user || this.updatingUserIds().has(user.id)) {
      return;
    }

    this.setUpdating(user.id, true);
    this.errorMessage.set(null);
    this.usernameErrorMessage.set(null);

    this.adminUsersApi.updateUsername(user.id, confirmation).subscribe({
      next: ({ user: updatedUser }) => {
        this.users.update((users) =>
          users.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
        );
        this.appState.updateCurrentUser(updatedUser);
        this.pendingUsernameChange.set(null);
        this.setUpdating(user.id, false);
      },
      error: (error: unknown) => {
        const message =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'Username could not be changed.';

        if (error instanceof HttpErrorResponse && [400, 403, 409].includes(error.status)) {
          this.usernameErrorMessage.set(message);
        } else {
          this.errorMessage.set(message);
          this.pendingUsernameChange.set(null);
        }

        this.setUpdating(user.id, false);
      }
    });
  }

  protected isPendingUsernameChangeSubmitting(): boolean {
    const user = this.pendingUsernameChange();

    return user ? this.updatingUserIds().has(user.id) : false;
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
