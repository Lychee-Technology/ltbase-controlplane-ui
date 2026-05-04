import type { SessionState, StackConfig } from '../types';

export function buildLoginURL(stack: StackConfig, state: string): string {
  const url = new URL('/oauth/authorize', stack.authBaseUrl);
  url.searchParams.set('client_id', stack.oidcClientId);
  url.searchParams.set('redirect_uri', stack.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  return url.toString();
}

export function parseAuthCallback(callbackURL: string): { code: string; state: string } {
  const url = new URL(callbackURL);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    throw new Error('auth callback requires code and state');
  }
  return { code, state };
}

export async function exchangeCodeForSession(
  stack: StackConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionState> {
  const response = await fetchImpl(`${stack.authBaseUrl}/api/v1/login/oidc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, project_id: stack.key }),
  });
  if (!response.ok) {
    throw new Error(`token exchange failed: ${response.status}`);
  }
  const body = (await response.json()) as Record<string, unknown>;
  if (typeof body.access_token !== 'string') {
    throw new Error('token exchange response missing access_token');
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : undefined,
  };
}
