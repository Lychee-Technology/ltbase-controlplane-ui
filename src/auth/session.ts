import type { SessionState } from '../types';

const SESSION_KEY_PREFIX = 'ltbase-controlplane-session:';
const PENDING_LOGIN_KEY_PREFIX = 'ltbase-controlplane-pending-login:';

interface PendingLoginState {
  providerName: string;
  providerType: 'supabase';
}

export function loadSession(storage: Storage, stackKey: string): SessionState | null {
  const raw = storage.getItem(sessionKey(stackKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionState;
    if (typeof parsed.accessToken !== 'string' || parsed.accessToken.trim() === '') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(storage: Storage, stackKey: string, session: SessionState): void {
  storage.setItem(sessionKey(stackKey), JSON.stringify(session));
}

export function clearSession(storage: Storage, stackKey: string): void {
  storage.removeItem(sessionKey(stackKey));
}

export function loadPendingLogin(storage: Storage, stackKey: string): PendingLoginState | null {
  const raw = storage.getItem(pendingLoginKey(stackKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingLoginState;
    if (parsed.providerType !== 'supabase' || typeof parsed.providerName !== 'string' || parsed.providerName.trim() === '') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePendingLogin(storage: Storage, stackKey: string, pendingLogin: PendingLoginState): void {
  storage.setItem(pendingLoginKey(stackKey), JSON.stringify(pendingLogin));
}

export function clearPendingLogin(storage: Storage, stackKey: string): void {
  storage.removeItem(pendingLoginKey(stackKey));
}

function sessionKey(stackKey: string): string {
  return `${SESSION_KEY_PREFIX}${stackKey}`;
}

function pendingLoginKey(stackKey: string): string {
  return `${PENDING_LOGIN_KEY_PREFIX}${stackKey}`;
}
