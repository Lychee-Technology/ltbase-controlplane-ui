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
  createReferral(data: { code: string; policy_id?: string; expires_at_ms: number }): Promise<unknown>;
  importReferrals(data: unknown): Promise<unknown>;
  updateReferralExpiration(code: string, data: { expires_at_ms: number }): Promise<unknown>;
  disableReferral(code: string): Promise<unknown>;
  deleteReferral(code: string): Promise<unknown>;
  dryRunRepair(): Promise<unknown>;
  applyRepair(): Promise<unknown>;
  listPolicies(): Promise<unknown>;
  getPolicy(policyId: string): Promise<unknown>;
  createPolicy(data: { name: string; description: string; policy_document: unknown }): Promise<unknown>;
  updatePolicy(policyId: string, data: { name: string; description: string; policy_document: unknown }): Promise<unknown>;
  deletePolicy(policyId: string): Promise<unknown>;
  listRoles(): Promise<unknown>;
  getRole(roleRef: string): Promise<unknown>;
  createRole(data: { name: string; description: string; parent_role_ids: string[] }): Promise<unknown>;
  updateRole(roleRef: string, data: { name: string; description: string; parent_role_ids: string[] }): Promise<unknown>;
  deleteRole(roleRef: string): Promise<unknown>;
  listRolePolicies(roleRef: string): Promise<unknown>;
  attachRolePolicy(roleRef: string, policyRef: string): Promise<unknown>;
  detachRolePolicy(roleRef: string, policyRef: string): Promise<unknown>;
  listUsers(params?: { q?: string; provider?: string; ou_id?: string; manager_user_id?: string }): Promise<unknown>;
  getUser(userId: string): Promise<unknown>;
  updateUser(userId: string, data: { primary_ou_id: string; report_to_user_id: string }): Promise<unknown>;
  attachUserRole(userId: string, roleId: string): Promise<unknown>;
  detachUserRole(userId: string, roleId: string): Promise<unknown>;
  listUserPolicies(userId: string): Promise<unknown>;
  attachUserPolicy(userId: string, policyId: string): Promise<unknown>;
  detachUserPolicy(userId: string, policyId: string): Promise<unknown>;
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
      if (params?.status) { qs.set('status', params.status); }
      if (params?.code) { qs.set('code', params.code); }
      const q = qs.toString();
      return get(q ? `/auth/referrals?${q}` : '/auth/referrals');
    },
    createReferral: (data) => post('/auth/referrals', data),
    importReferrals: (data) => post('/auth/referrals?import=1', data),
    updateReferralExpiration: (code, data) => patch(`/auth/referrals/${encodeURIComponent(code)}`, data),
    disableReferral: (code) => post(`/auth/referrals/${encodeURIComponent(code)}/disable`, {}),
    deleteReferral: (code) => del(`/auth/referrals/${encodeURIComponent(code)}`),
    dryRunRepair: () => post('/repair/dry-run', {}),
    applyRepair: () => post('/repair/apply', { confirm: true }),
    listPolicies: () => get('/auth/policies'),
    getPolicy: (policyId) => get(`/auth/policies/${encodeURIComponent(policyId)}`),
    createPolicy: (data) => post('/auth/policies', data),
    updatePolicy: (policyId, data) => patch(`/auth/policies/${encodeURIComponent(policyId)}`, data),
    deletePolicy: (policyId) => del(`/auth/policies/${encodeURIComponent(policyId)}`),
    listRoles: () => get('/auth/roles'),
    getRole: (roleRef) => get(`/auth/roles/${encodeURIComponent(roleRef)}`),
    createRole: (data) => post('/auth/roles', data),
    updateRole: (roleRef, data) => patch(`/auth/roles/${encodeURIComponent(roleRef)}`, data),
    deleteRole: (roleRef) => del(`/auth/roles/${encodeURIComponent(roleRef)}`),
    listRolePolicies: (roleRef) => get(`/auth/principals/role/${encodeURIComponent(roleRef)}/policies`),
    attachRolePolicy: (roleRef, policyRef) => put(`/auth/principals/role/${encodeURIComponent(roleRef)}/policies/${encodeURIComponent(policyRef)}`, {}),
    detachRolePolicy: (roleRef, policyRef) => del(`/auth/principals/role/${encodeURIComponent(roleRef)}/policies/${encodeURIComponent(policyRef)}`),
    listUsers: (params) => {
      const qs = new URLSearchParams();
      if (params?.q) { qs.set('q', params.q); }
      if (params?.provider) { qs.set('provider', params.provider); }
      if (params?.ou_id) { qs.set('ou_id', params.ou_id); }
      if (params?.manager_user_id) { qs.set('manager_user_id', params.manager_user_id); }
      const q = qs.toString();
      return get(q ? `/auth/users?${q}` : '/auth/users');
    },
    getUser: (userId) => get(`/auth/users/${encodeURIComponent(userId)}`),
    updateUser: (userId, data) => patch(`/auth/users/${encodeURIComponent(userId)}`, data),
    attachUserRole: (userId, roleId) => put(`/auth/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`, {}),
    detachUserRole: (userId, roleId) => del(`/auth/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`),
    listUserPolicies: (userId) => get(`/auth/principals/user/${encodeURIComponent(userId)}/policies`),
    attachUserPolicy: (userId, policyId) => put(`/auth/principals/user/${encodeURIComponent(userId)}/policies/${encodeURIComponent(policyId)}`, {}),
    detachUserPolicy: (userId, policyId) => del(`/auth/principals/user/${encodeURIComponent(userId)}/policies/${encodeURIComponent(policyId)}`),
  };
}
