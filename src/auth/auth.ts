import type { ControlPlaneError, SessionState, StackConfig } from '../types';

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
    throw await parseAuthError(response);
  }
  const body = (await response.json()) as Record<string, unknown>;
  if (typeof body.access_token !== 'string') {
    const error: ControlPlaneError = {
      code: 'auth_error',
      message: 'token exchange response missing access_token',
      status: response.status,
      kind: 'auth',
    };
    throw error;
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : undefined,
  };
}

async function parseAuthError(response: Response): Promise<ControlPlaneError> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === 'string' ? body.code : `http_${response.status}`,
      message: typeof body.message === 'string' ? body.message : `Auth error: HTTP ${response.status}`,
      status: response.status,
      requestId: typeof body.request_id === 'string' ? body.request_id : undefined,
      details: body.details,
      kind: 'auth',
    };
  } catch {
    return {
      code: `http_${response.status}`,
      message: `Auth error: HTTP ${response.status}`,
      status: response.status,
      kind: 'auth',
    };
  }
}
