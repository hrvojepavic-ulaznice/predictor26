import { Injectable, computed, signal } from '@angular/core';

import { AuthUser } from '@models/auth-user.model';

interface StoredSession {
  readonly token: string;
  readonly user: AuthUser | null;
}

interface PersistedSession {
  readonly token: string;
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

  setSession(session: { readonly token: string; readonly user: AuthUser }): void {
    this.sessionSignal.set(session);
    writeStoredSession(session.token);
  }

  updateCurrentUser(user: AuthUser): void {
    const session = this.sessionSignal();

    if (!session || (session.user !== null && session.user.id !== user.id)) {
      return;
    }

    this.sessionSignal.set({
      token: session.token,
      user
    });
    writeStoredSession(session.token);
  }

  setToken(token: string): void {
    this.sessionSignal.set({
      token,
      user: null
    });
    writeStoredSession(token);
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
    const parsedSession = JSON.parse(storedSession) as Partial<PersistedSession>;

    if (!parsedSession.token) {
      return null;
    }

    return {
      token: parsedSession.token,
      user: null
    };
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

function writeStoredSession(token: string): void {
  localStorage.setItem(sessionStorageKey, JSON.stringify({ token } satisfies PersistedSession));
}
