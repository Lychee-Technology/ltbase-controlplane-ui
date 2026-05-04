import type { ControlPlaneError, StackConfig } from '../types';

export interface ControlPlaneClient {
  getStatus(): Promise<unknown>;
  getSchemaStatus(): Promise<unknown>;
  getCapabilityCatalog(): Promise<unknown>;
  putCapabilityCatalog(data: unknown): Promise<unknown>;
  getActionTemplateCatalog(): Promise<unknown>;
  putActionTemplateCatalog(data: unknown): Promise<unknown>;
  getComplianceProfile(): Promise<unknown>;
  putComplianceProfile(data: unknown): Promise<unknown>;
  listReferrals(query?: string): Promise<unknown>;
  importReferrals(data: unknown): Promise<unknown>;
  dryRunRepair(): Promise<unknown>;
  applyRepair(confirmation: string): Promise<unknown>;
}

export function createControlPlaneClient(
  stack: StackConfig,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): ControlPlaneClient {
  const baseURL = `${stack.controlPlaneBaseUrl}/api/control-plane/v1`;

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetchImpl(`${baseURL}${path}`, { ...init, headers });
    const body = await readJSON(response);
    if (!response.ok) {
      throw normalizeControlPlaneError(body, response.status);
    }
    return body;
  }

  return {
    getStatus: () => request('/status'),
    getSchemaStatus: () => request('/schema-status'),
    getCapabilityCatalog: () => request('/catalogs/capabilities'),
    putCapabilityCatalog: (data) => request('/catalogs/capabilities', jsonRequest('PUT', data)),
    getActionTemplateCatalog: () => request('/catalogs/action-templates'),
    putActionTemplateCatalog: (data) => request('/catalogs/action-templates', jsonRequest('PUT', data)),
    getComplianceProfile: () => request('/compliance-profile'),
    putComplianceProfile: (data) => request('/compliance-profile', jsonRequest('PUT', data)),
    listReferrals: (query) => request(query ? `/referrals?q=${encodeURIComponent(query)}` : '/referrals'),
    importReferrals: (data) => request('/referrals/import', jsonRequest('POST', data)),
    dryRunRepair: () => request('/repair/dry-run', jsonRequest('POST', {})),
    applyRepair: (confirmation) => request('/repair/apply', jsonRequest('POST', { confirmation })),
  };
}

function jsonRequest(method: string, value: unknown): RequestInit {
  return { method, body: JSON.stringify(value) };
}

async function readJSON(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return {};
  }
  return JSON.parse(text) as unknown;
}

function normalizeControlPlaneError(body: unknown, status: number): ControlPlaneError {
  if (typeof body === 'object' && body !== null) {
    const data = body as Record<string, unknown>;
    if (typeof data.code === 'string' || typeof data.message === 'string' || typeof data.error === 'string') {
      return {
        code: typeof data.code === 'string' ? data.code : `http_${status}`,
        message: typeof data.message === 'string' ? data.message : String(data.error ?? `HTTP ${status}`),
        details: data.details,
      };
    }
  }
  return { code: `http_${status}`, message: `HTTP ${status}` };
}
