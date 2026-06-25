import { describe, expect, it, vi } from 'vitest';
import * as authModule from './auth';
import { exchangeExternalToken, refreshSession } from './auth';
import type { StackConfig } from '../types';

const stack: StackConfig = {
  key: 'prod',
  label: 'Production',
  projectId: '11111111-1111-4111-8111-111111111111',
  authBaseUrl: 'https://auth.example.com',
  controlPlaneBaseUrl: 'https://control.example.com',
  apiBaseUrl: 'https://api.example.com',
  authProviders: [],
  oidcClientId: 'ltbase-controlplane-ui',
  redirectUri: 'https://admin.example.com/auth/callback',
};

describe('exchangeExternalToken', () => {
  it('does not export the legacy login URL helper', () => {
    expect('buildLoginURL' in authModule).toBe(false);
  });

  it('posts provider jwt to the provider-specific LTBase login route', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ltbase-access', refresh_token: 'ltbase-refresh' }),
    });

    await exchangeExternalToken(stack, 'firebase', 'provider-jwt', fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith('https://auth.example.com/api/v1/login/firebase', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer provider-jwt',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ project_id: '11111111-1111-4111-8111-111111111111' }),
    });
  });

  it('encodes provider names before interpolating them into the login route', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ltbase-access' }),
    });

    await exchangeExternalToken(stack, 'firebase/google?team=a&b', 'provider-jwt', fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://auth.example.com/api/v1/login/firebase%2Fgoogle%3Fteam%3Da%26b',
      expect.any(Object),
    );
  });

  it('returns LTBase access and refresh tokens from the exchange response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ltbase-access', refresh_token: 'ltbase-refresh' }),
    });

    await expect(
      exchangeExternalToken(stack, 'supabase', 'provider-jwt', fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });
  });

  it('throws ControlPlaneError with request_id on auth failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 'unauthorized', message: 'invalid provider token', request_id: 'req-xyz' }),
    });

    await expect(
      exchangeExternalToken(stack, 'firebase', 'bad-token', fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'unauthorized',
      message: 'invalid provider token',
      status: 401,
      requestId: 'req-xyz',
      details: undefined,
      kind: 'auth',
    });
  });

  it('throws a kind:auth ControlPlaneError when the OK response is missing access_token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ refresh_token: 'only-refresh' }),
    });

    await expect(
      exchangeExternalToken(stack, 'firebase', 'provider-jwt', fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'auth_error',
      message: 'token exchange response missing access_token',
      status: 200,
      kind: 'auth',
    });
  });

  it('throws fallback ControlPlaneError on non-JSON auth error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'Internal Server Error',
    });

    await expect(
      exchangeExternalToken(stack, 'firebase', 'token', fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'http_500',
      message: 'Auth error: HTTP 500',
      status: 500,
      kind: 'auth',
    });
  });
});

describe('refreshSession', () => {
  it('posts the LTBase refresh token to the shared refresh route', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ltbase-access-2', refresh_token: 'ltbase-refresh-2' }),
    });

    await refreshSession(stack, 'ltbase-refresh', fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledWith('https://auth.example.com/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ltbase-refresh',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ project_id: '11111111-1111-4111-8111-111111111111' }),
    });
  });
});
