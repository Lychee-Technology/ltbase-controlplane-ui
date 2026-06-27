import type { RepairRequest, StackConfig } from '../types';
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
  dryRunRepair(options?: RepairRequest): Promise<unknown>;
  applyRepair(options?: RepairRequest): Promise<unknown>;
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
  listBindingPolicies(): Promise<unknown>;
  createBindingPolicy(data: { enabled: boolean; priority: number; rules: unknown }): Promise<unknown>;
  updateBindingPolicy(policyId: string, data: { enabled: boolean; priority: number; rules: unknown }): Promise<unknown>;
  deleteBindingPolicy(policyId: string): Promise<unknown>;
  listOrgUnits(params?: { parent_ou_id?: string; tree?: boolean; q?: string }): Promise<unknown>;
  getOrgUnit(ouId: string): Promise<unknown>;
  createOrgUnit(data: { ou_id: string; name: string; parent_ou_id: string; block_inheritance: boolean }): Promise<unknown>;
  updateOrgUnit(ouId: string, data: { name: string; parent_ou_id: string; block_inheritance: boolean }): Promise<unknown>;
  deleteOrgUnit(ouId: string): Promise<unknown>;
  listOrgUnitUsers(ouId: string, params?: { include_subtree?: boolean }): Promise<unknown>;
  moveUserToOrgUnit(ouId: string, userId: string): Promise<unknown>;
  listOrgUnitPolicies(ouId: string): Promise<unknown>;
  attachOrgUnitPolicy(ouId: string, policyId: string, data: { enforced: boolean }): Promise<unknown>;
  detachOrgUnitPolicy(ouId: string, policyId: string): Promise<unknown>;
  getUserManager(userId: string): Promise<unknown>;
  setUserManager(userId: string, data: { report_to_user_id: string }): Promise<unknown>;
  clearUserManager(userId: string): Promise<unknown>;
  listUserDirectReports(userId: string, params?: { recursive?: boolean }): Promise<unknown>;
  getOrgChart(params?: { root_ou_id?: string; include_users?: boolean; include_policies?: boolean }): Promise<unknown>;
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
    dryRunRepair: (options) => {
      const body: Record<string, unknown> = {};
      if (options?.project_id) { body.project_id = options.project_id; }
      if (options?.force_rebuild_views !== undefined) { body.force_rebuild_views = options.force_rebuild_views; }
      return post('/repair/dry-run', body);
    },
    applyRepair: (options) => {
      const body: Record<string, unknown> = { confirm: true };
      if (options?.project_id) { body.project_id = options.project_id; }
      if (options?.force_rebuild_views !== undefined) { body.force_rebuild_views = options.force_rebuild_views; }
      return post('/repair/apply', body);
    },
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
    listBindingPolicies: () => get('/auth/binding-policies'),
    createBindingPolicy: (data) => post('/auth/binding-policies', data),
    updateBindingPolicy: (policyId, data) => patch(`/auth/binding-policies/${encodeURIComponent(policyId)}`, data),
    deleteBindingPolicy: (policyId) => del(`/auth/binding-policies/${encodeURIComponent(policyId)}`),
    listOrgUnits: (params) => {
      const qs = new URLSearchParams();
      if (params?.parent_ou_id) { qs.set('parent_ou_id', params.parent_ou_id); }
      if (params?.tree) { qs.set('tree', 'true'); }
      if (params?.q) { qs.set('q', params.q); }
      const q = qs.toString();
      return get(q ? `/org/units?${q}` : '/org/units');
    },
    getOrgUnit: (ouId) => get(`/org/units/${encodeURIComponent(ouId)}`),
    createOrgUnit: (data) => post('/org/units', data),
    updateOrgUnit: (ouId, data) => patch(`/org/units/${encodeURIComponent(ouId)}`, data),
    deleteOrgUnit: (ouId) => del(`/org/units/${encodeURIComponent(ouId)}`),
    listOrgUnitUsers: (ouId, params) => {
      const qs = new URLSearchParams();
      if (params?.include_subtree) { qs.set('include_subtree', 'true'); }
      const q = qs.toString();
      return get(q ? `/org/units/${encodeURIComponent(ouId)}/users?${q}` : `/org/units/${encodeURIComponent(ouId)}/users`);
    },
    moveUserToOrgUnit: (ouId, userId) => put(`/org/units/${encodeURIComponent(ouId)}/users/${encodeURIComponent(userId)}`, {}),
    listOrgUnitPolicies: (ouId) => get(`/org/units/${encodeURIComponent(ouId)}/policies`),
    attachOrgUnitPolicy: (ouId, policyId, data) => put(`/org/units/${encodeURIComponent(ouId)}/policies/${encodeURIComponent(policyId)}`, data),
    detachOrgUnitPolicy: (ouId, policyId) => del(`/org/units/${encodeURIComponent(ouId)}/policies/${encodeURIComponent(policyId)}`),
    getUserManager: (userId) => get(`/org/users/${encodeURIComponent(userId)}/manager`),
    setUserManager: (userId, data) => put(`/org/users/${encodeURIComponent(userId)}/manager`, data),
    clearUserManager: (userId) => del(`/org/users/${encodeURIComponent(userId)}/manager`),
    listUserDirectReports: (userId, params) => {
      const qs = new URLSearchParams();
      if (params?.recursive) { qs.set('recursive', 'true'); }
      const q = qs.toString();
      return get(q ? `/org/users/${encodeURIComponent(userId)}/direct-reports?${q}` : `/org/users/${encodeURIComponent(userId)}/direct-reports`);
    },
    getOrgChart: (params) => {
      const qs = new URLSearchParams();
      if (params?.root_ou_id) { qs.set('root_ou_id', params.root_ou_id); }
      if (params?.include_users) { qs.set('include_users', 'true'); }
      if (params?.include_policies) { qs.set('include_policies', 'true'); }
      const q = qs.toString();
      return get(q ? `/org/charts?${q}` : '/org/charts');
    },
  };
}
