import type { StackConfig } from '../types';
import { jsonRequest, requestJSON } from './http';

export interface ControlPlaneClient {
  getStatus(): Promise<unknown>;
  getSchemaStatus(): Promise<unknown>;
  getAuthConfig(): Promise<unknown>;
  listWorkflows(): Promise<unknown>;
  getCapabilityCatalog(): Promise<unknown>;
  putCapabilityCatalog(data: unknown): Promise<unknown>;
  getActionTemplateCatalog(): Promise<unknown>;
  putActionTemplateCatalog(data: unknown): Promise<unknown>;
  getComplianceProfile(): Promise<unknown>;
  putComplianceProfile(data: unknown): Promise<unknown>;
  listReferrals(params?: { status?: string; code?: string }): Promise<unknown>;
  importReferrals(data: unknown): Promise<unknown>;
  dryRunRepair(): Promise<unknown>;
  applyRepair(): Promise<unknown>;
  listPolicies(): Promise<unknown>;
  getPolicy(policyId: string): Promise<unknown>;
  createPolicy(data: { name: string; description: string; policy_document: unknown }): Promise<unknown>;
  updatePolicy(policyId: string, data: { name: string; description: string; policy_document: unknown }): Promise<unknown>;
  deletePolicy(policyId: string): Promise<unknown>;
}

export function createControlPlaneClient(
  stack: StackConfig,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): ControlPlaneClient {
  const baseURL = `${stack.controlPlaneBaseUrl}/api/v1`;

  function get(path: string): Promise<unknown> {
    return requestJSON(baseURL, path, accessToken, undefined, fetchImpl);
  }

  function put(path: string, data: unknown): Promise<unknown> {
    return requestJSON(baseURL, path, accessToken, jsonRequest('PUT', data), fetchImpl);
  }

  function post(path: string, data: unknown): Promise<unknown> {
    return requestJSON(baseURL, path, accessToken, jsonRequest('POST', data), fetchImpl);
  }

  function patch(path: string, data: unknown): Promise<unknown> {
    return requestJSON(baseURL, path, accessToken, jsonRequest('PATCH', data), fetchImpl);
  }

  function del(path: string): Promise<unknown> {
    return requestJSON(baseURL, path, accessToken, { method: 'DELETE' }, fetchImpl);
  }

  return {
    getStatus: () => get('/status'),
    getSchemaStatus: () => get('/schema/status'),
    getAuthConfig: () => get('/auth/config'),
    listWorkflows: () => get('/workflows'),
    getCapabilityCatalog: () => get('/catalogs/capabilities'),
    putCapabilityCatalog: (data) => put('/catalogs/capabilities', data),
    getActionTemplateCatalog: () => get('/catalogs/action-templates'),
    putActionTemplateCatalog: (data) => put('/catalogs/action-templates', data),
    getComplianceProfile: () => get('/compliance-profile'),
    putComplianceProfile: (data) => put('/compliance-profile', data),
    listReferrals: (params) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.code) qs.set('code', params.code);
      const q = qs.toString();
      return get(q ? `/auth/referrals?${q}` : '/auth/referrals');
    },
    importReferrals: (data) => post('/auth/referrals?import=1', data),
    dryRunRepair: () => post('/repair/dry-run', {}),
    applyRepair: () => post('/repair/apply', { confirm: true }),
    listPolicies: () => get('/auth/policies'),
    getPolicy: (policyId) => get(`/auth/policies/${encodeURIComponent(policyId)}`),
    createPolicy: (data) => post('/auth/policies', data),
    updatePolicy: (policyId, data) => patch(`/auth/policies/${encodeURIComponent(policyId)}`, data),
    deletePolicy: (policyId) => del(`/auth/policies/${encodeURIComponent(policyId)}`),
  };
}
