import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseAuthProvider } from './supabaseAuth';

const getSession = vi.fn();
const signInWithOAuth = vi.fn();
const signOut = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession,
      signInWithOAuth,
      signOut,
    },
  })),
}));

describe('createSupabaseAuthProvider', () => {
  beforeEach(() => {
    getSession.mockReset();
    signInWithOAuth.mockReset();
    signOut.mockReset();
  });

  it('returns an existing Supabase session token', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'supabase-token',
          user: { email: 'admin@example.com', id: 'user-1' },
        },
      },
    });

    const provider = createSupabaseAuthProvider({
      type: 'supabase',
      name: 'backup',
      label: 'Backup Supabase',
      supabaseUrl: 'https://supabase.example.com',
      supabaseAnonKey: 'anon-key',
    });

    await expect(provider.signIn()).resolves.toEqual({
      type: 'token',
      externalToken: 'supabase-token',
      subjectLabel: 'admin@example.com',
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('returns the callback-completed Supabase session token without starting another redirect', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'supabase-callback-token',
          user: { email: 'callback-admin@example.com', id: 'user-2' },
        },
      },
    });

    const provider = createSupabaseAuthProvider({
      type: 'supabase',
      name: 'backup',
      label: 'Backup Supabase',
      supabaseUrl: 'https://supabase.example.com',
      supabaseAnonKey: 'anon-key',
    }, 'https://admin.example.com/auth/callback');

    await expect(provider.signIn()).resolves.toEqual({
      type: 'token',
      externalToken: 'supabase-callback-token',
      subjectLabel: 'callback-admin@example.com',
    });
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('represents redirect start explicitly instead of throwing an error', async () => {
    getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });
    signInWithOAuth.mockResolvedValue({ error: null });

    const provider = createSupabaseAuthProvider({
      type: 'supabase',
      name: 'backup',
      label: 'Backup Supabase',
      supabaseUrl: 'https://supabase.example.com',
      supabaseAnonKey: 'anon-key',
    }, 'https://admin.example.com/auth/callback');

    await expect(provider.signIn()).resolves.toEqual({ type: 'redirect' });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://admin.example.com/auth/callback' },
    });
  });

  it('falls back to redirect start without redirectTo when no runtime callback is provided', async () => {
    getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });
    signInWithOAuth.mockResolvedValue({ error: null });

    const provider = createSupabaseAuthProvider({
      type: 'supabase',
      name: 'backup',
      label: 'Backup Supabase',
      supabaseUrl: 'https://supabase.example.com',
      supabaseAnonKey: 'anon-key',
    });

    await expect(provider.signIn()).resolves.toEqual({ type: 'redirect' });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: undefined,
    });
  });
});
