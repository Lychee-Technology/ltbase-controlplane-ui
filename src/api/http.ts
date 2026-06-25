import type { ControlPlaneError } from '../types';

export function jsonRequest(method: string, value: unknown): RequestInit {
  return { method, body: JSON.stringify(value) };
}

export async function requestJSON(
  baseUrl: string,
  path: string,
  accessToken: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
  } catch (err) {
    throw normalizeNetworkError(err);
  }

  const body = await readJSON(response);
  if (!response.ok) {
    throw normalizeAPIError(body, response.status);
  }
  return body;
}

function normalizeAPIError(body: unknown, status: number): ControlPlaneError {
  if (typeof body === 'object' && body !== null) {
    const data = body as Record<string, unknown>;
    return {
      code: typeof data.code === 'string' ? data.code : `http_${status}`,
      message: typeof data.message === 'string' ? data.message : String(data.error ?? `HTTP ${status}`),
      status,
      requestId: typeof data.request_id === 'string' ? data.request_id : undefined,
      details: data.details,
      kind: 'api',
    };
  }
  return { code: `http_${status}`, message: `HTTP ${status}`, status, kind: 'api' };
}

function normalizeNetworkError(error: unknown): ControlPlaneError {
  const message =
    error instanceof TypeError && error.message
      ? error.message
      : 'Network request failed';
  return {
    code: 'network_error',
    message,
    kind: 'network',
  };
}

async function readJSON(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}
