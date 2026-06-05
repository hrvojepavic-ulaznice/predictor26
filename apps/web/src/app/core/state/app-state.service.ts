import { Injectable, computed, signal } from '@angular/core';

import { AuthUser } from '@models/auth-user.model';

interface StoredSession {
  readonly token: string;
  readonly user: AuthUser;
}

const sessionStorageKey = 'predictor26.session';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private readonly sessionSignal = signal<StoredSession | null>(readStoredSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly currentUser = computed(() => this.sessionSignal()?.user ?? null);
  readonly token = computed(() => this.sessionSignal()?.token ?? null);
  readonly isLoggedIn = computed(() => this.sessionSignal() !== null);

  setSession(session: StoredSession): void {
    this.sessionSignal.set(session);
    localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  }

  updateCurrentUser(user: AuthUser): void {
    const session = this.sessionSignal();

    if (!session || session.user.id !== user.id) {
      return;
    }

    this.setSession({
      token: session.token,
      user
    });
  }

  clearSession(): void {
    this.sessionSignal.set(null);
    localStorage.removeItem(sessionStorageKey);
  }
}

function readStoredSession(): StoredSession | null {
  const storedSession = localStorage.getItem(sessionStorageKey);

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(storedSession) as StoredSession;

    if (!parsedSession.token || !parsedSession.user?.username) {
      return null;
    }

    return parsedSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}
