import { Injectable, computed, signal } from '@angular/core';

import { AuthUser } from '@models/auth-user.model';
import { Competition } from '@models/competition.models';

interface StoredSession {
  readonly token: string;
  readonly user: AuthUser | null;
  readonly activeCompetition: Competition | null;
}

interface PersistedSession {
  readonly token: string;
  readonly activeCompetition?: Competition | null;
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
  readonly activeCompetition = computed(() => this.sessionSignal()?.activeCompetition ?? null);
  readonly isLoggedIn = computed(() => this.sessionSignal() !== null);

  setSession(session: { readonly token: string; readonly user: AuthUser }): void {
    this.sessionSignal.set({
      ...session,
      activeCompetition: null
    });
    writeStoredSession(session.token, null);
  }

  updateCurrentUser(user: AuthUser): void {
    const session = this.sessionSignal();

    if (!session || (session.user !== null && session.user.id !== user.id)) {
      return;
    }

    this.sessionSignal.set({
      token: session.token,
      user,
      activeCompetition: session.activeCompetition
    });
    writeStoredSession(session.token, session.activeCompetition);
  }

  setToken(token: string): void {
    this.sessionSignal.set({
      token,
      user: null,
      activeCompetition: null
    });
    writeStoredSession(token, null);
  }

  setActiveCompetition(competition: Competition): void {
    const session = this.sessionSignal();

    if (!session) {
      return;
    }

    this.sessionSignal.set({
      ...session,
      activeCompetition: competition
    });
    writeStoredSession(session.token, competition);
  }

  clearActiveCompetition(): void {
    const session = this.sessionSignal();

    if (!session) {
      return;
    }

    this.sessionSignal.set({
      ...session,
      activeCompetition: null
    });
    writeStoredSession(session.token, null);
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
      user: null,
      activeCompetition: normalizePersistedCompetition(parsedSession.activeCompetition)
    };
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

function writeStoredSession(token: string, activeCompetition: Competition | null): void {
  localStorage.setItem(sessionStorageKey, JSON.stringify({ token, activeCompetition } satisfies PersistedSession));
}

function normalizePersistedCompetition(value: unknown): Competition | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const competition = value as Partial<Competition>;

  const isValid =
    typeof competition.id === 'number' &&
    Number.isInteger(competition.id) &&
    typeof competition.name === 'string' &&
    typeof competition.slug === 'string' &&
    (typeof competition.logoUrl === 'string' || competition.logoUrl === null) &&
    typeof competition.isFinished === 'boolean' &&
    typeof competition.isJoined === 'boolean' &&
    (typeof competition.tiebreakerName === 'string' || competition.tiebreakerName === null);

  if (!isValid) {
    return null;
  }

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    logoUrl: competition.logoUrl,
    isFinished: competition.isFinished,
    playoffsEnabled: competition.playoffsEnabled === true || (competition.playoffsEnabled === undefined && competition.slug === 'world-cup-2026'),
    isJoined: competition.isJoined,
    tiebreakerName: competition.tiebreakerName
  };
}
