import type { SessionState, StackConfig } from '../types';

export async function exchangeExternalToken(
  stack: StackConfig,
  providerName: string,
  externalToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionState> {
  const response = await fetchImpl(`${stack.authBaseUrl}/api/v1/login/${encodeURIComponent(providerName)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${externalToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ project_id: stack.projectId }),
  });
  return parseSessionResponse(response);
}

export async function refreshSession(
  stack: StackConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionState> {
  const response = await fetchImpl(`${stack.authBaseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ project_id: stack.projectId }),
  });
  return parseSessionResponse(response);
}

async function parseSessionResponse(response: Response): Promise<SessionState> {
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
