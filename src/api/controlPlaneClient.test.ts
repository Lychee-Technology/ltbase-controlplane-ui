import { describe, expect, it, vi } from 'vitest';
import { createControlPlaneClient } from './controlPlaneClient';
import type { StackConfig } from '../types';

const stack: StackConfig = {
  key: 'prod',
  label: 'Production',
  projectId: '11111111-1111-4111-8111-111111111111',
  authBaseUrl: 'https://auth.example.com',
  controlPlaneBaseUrl: 'https://control-plane.example.com',
  apiBaseUrl: 'https://api.example.com',
  authProviders: [],
  oidcClientId: 'ltbase-controlplane-ui',
  redirectUri: 'https://admin.example.com/auth/callback',
};

describe('createControlPlaneClient', () => {
  it('adds bearer auth and JSON headers, uses /api/v1 prefix', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: 'ok' }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.putCapabilityCatalog({ capabilities: [] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/catalogs/capabilities',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.any(Headers),
        body: JSON.stringify({ capabilities: [] }),
      }),
    );
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const headers = calls[0]?.[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('normalizes stable error payloads with request_id and kind', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'admin_required', message: 'Admin role required', request_id: 'req-abc' }), { status: 403 }),
    );
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await expect(client.getStatus()).rejects.toEqual({
      code: 'admin_required',
      message: 'Admin role required',
      status: 403,
      requestId: 'req-abc',
      details: undefined,
      kind: 'api',
    });
  });

  it('calls workflow endpoint with bearer auth', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listWorkflows();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/workflows',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getAuthConfig calls /api/v1/auth/config', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getAuthConfig();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/config',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getSchemaStatus calls /api/v1/schema/status', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getSchemaStatus();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/schema/status',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('listReferrals encodes status and code params into the query string', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listReferrals({ status: 'pending', code: 'A B' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals?status=pending&code=A+B',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('listReferrals omits the query string when no params are given', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listReferrals();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('dryRunRepair calls POST /api/v1/repair/dry-run with empty body when no options given', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.dryRunRepair();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/repair/dry-run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });

  it('dryRunRepair sends project_id and force_rebuild_views when provided', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.dryRunRepair({ project_id: 'custom-proj', force_rebuild_views: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/repair/dry-run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ project_id: 'custom-proj', force_rebuild_views: true }),
      }),
    );
  });

  it('dryRunRepair omits project_id when empty string provided', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.dryRunRepair({ project_id: '' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/repair/dry-run',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });

  it('applyRepair sends confirm:true with empty body when no options given', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.applyRepair();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/repair/apply',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
    );
  });

  it('applyRepair sends confirm:true with project_id and force_rebuild_views', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.applyRepair({ project_id: 'custom-proj', force_rebuild_views: false });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/repair/apply',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: true, project_id: 'custom-proj', force_rebuild_views: false }),
      }),
    );
  });

  it('listPolicies calls GET /api/v1/auth/policies', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listPolicies();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/policies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getPolicy calls GET with encoded policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getPolicy('admin.controlplane');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/policies/admin.controlplane',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('createPolicy calls POST with name, description, policy_document', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { policy: {} } }), { status: 201 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.createPolicy({
      name: 'Sales Read',
      description: 'Read sales data',
      policy_document: { statements: [] },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/policies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Sales Read', description: 'Read sales data', policy_document: { statements: [] } }),
      }),
    );
  });

  it('updatePolicy calls PATCH with encoded policy id and body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { policy: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updatePolicy('policy.sales_read', {
      name: 'Sales Read v2',
      description: 'Updated',
      policy_document: { statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }] },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/policies/policy.sales_read',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Sales Read v2',
          description: 'Updated',
          policy_document: { statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }] },
        }),
      }),
    );
  });

  it('deletePolicy calls DELETE with encoded policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'deleted' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.deletePolicy('admin.controlplane');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/policies/admin.controlplane',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listRoles calls GET /api/v1/auth/roles', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listRoles();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/roles',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getRole calls GET with encoded role ref', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getRole('role.admin');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/roles/role.admin',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('createRole calls POST with name, description, parent_role_ids', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { role: {} } }), { status: 201 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.createRole({
      name: 'Manager',
      description: 'People manager',
      parent_role_ids: ['role-admin-id'],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/roles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Manager', description: 'People manager', parent_role_ids: ['role-admin-id'] }),
      }),
    );
  });

  it('updateRole calls PATCH with encoded role ref and body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { role: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updateRole('role.admin', {
      name: 'Admin v2',
      description: 'Updated admin',
      parent_role_ids: [],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/roles/role.admin',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Admin v2', description: 'Updated admin', parent_role_ids: [] }),
      }),
    );
  });

  it('deleteRole calls DELETE with encoded role ref', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { role_id: 'role.admin', status: 'deleted' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.deleteRole('role.admin');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/roles/role.admin',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listRolePolicies calls GET with encoded role ref', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listRolePolicies('role.admin');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/role/role.admin/policies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('attachRolePolicy calls PUT with encoded role ref and policy ref', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'attached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.attachRolePolicy('role.admin', 'policy.sales_read');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/role/role.admin/policies/policy.sales_read',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('detachRolePolicy calls DELETE with encoded role ref and policy ref', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'detached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.detachRolePolicy('role.admin', 'policy.sales_read');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/role/role.admin/policies/policy.sales_read',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listUsers calls GET /api/v1/auth/users with no query string when no filters given', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listUsers();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('listUsers encodes filter params into query string', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listUsers({ q: 'alice', provider: 'google', ou_id: 'ou-root', manager_user_id: 'user-mgr' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users?q=alice&provider=google&ou_id=ou-root&manager_user_id=user-mgr',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getUser calls GET with encoded user id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getUser('user-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users/user-1',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('updateUser calls PATCH with primary_ou_id and report_to_user_id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updateUser('user-1', { primary_ou_id: 'ou-child', report_to_user_id: 'user-3' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users/user-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ primary_ou_id: 'ou-child', report_to_user_id: 'user-3' }),
      }),
    );
  });

  it('attachUserRole calls PUT with encoded user id and role id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'attached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.attachUserRole('user-1', 'role.admin');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users/user-1/roles/role.admin',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('detachUserRole calls DELETE with encoded user id and role id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'detached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.detachUserRole('user-1', 'role.admin');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/users/user-1/roles/role.admin',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listUserPolicies calls GET /api/v1/auth/principals/user/{id}/policies', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listUserPolicies('user-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/user/user-1/policies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('attachUserPolicy calls PUT with encoded user id and policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'attached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.attachUserPolicy('user-1', 'policy.sales_read');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/user/user-1/policies/policy.sales_read',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('detachUserPolicy calls DELETE with encoded user id and policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'detached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.detachUserPolicy('user-1', 'policy.sales_read');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/principals/user/user-1/policies/policy.sales_read',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('createReferral calls POST with code, policy_id and expires_at_ms', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { code: 'CODE1', project_id: 'proj', created_at: 1700000000000 } }), { status: 201 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.createReferral({ code: 'CODE1', policy_id: 'policy.read', expires_at_ms: 1800000000000 });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'CODE1', policy_id: 'policy.read', expires_at_ms: 1800000000000 }),
      }),
    );
  });

  it('updateReferralExpiration calls PATCH with encoded referral code', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { code: 'CODE1', expires_at: 1700000000000 } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updateReferralExpiration('CODE1', { expires_at_ms: 1700000000000 });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals/CODE1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ expires_at_ms: 1700000000000 }),
      }),
    );
  });

  it('disableReferral calls POST with /disable suffix', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { code: 'CODE1', disabled: true, status: 'disabled' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.disableReferral('CODE1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals/CODE1/disable',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deleteReferral calls DELETE with encoded referral code', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { code: 'CODE1', status: 'deleted' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.deleteReferral('CODE1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/referrals/CODE1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listBindingPolicies calls GET /api/v1/auth/binding-policies', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listBindingPolicies();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/binding-policies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('createBindingPolicy calls POST with enabled, priority, rules', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { binding_policy: {} } }), { status: 201 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.createBindingPolicy({ enabled: true, priority: 10, rules: [{ l: 'and', c: [] }] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/binding-policies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ enabled: true, priority: 10, rules: [{ l: 'and', c: [] }] }),
      }),
    );
  });

  it('updateBindingPolicy calls PATCH with encoded policy id and body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { binding_policy: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updateBindingPolicy('0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08', { enabled: false, priority: 5, rules: [] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/binding-policies/0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ enabled: false, priority: 5, rules: [] }),
      }),
    );
  });

  it('deleteBindingPolicy calls DELETE with encoded policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08', status: 'deleted' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.deleteBindingPolicy('0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/auth/binding-policies/0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listOrgUnits calls GET /api/v1/org/units with no query string when no params given', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listOrgUnits();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('listOrgUnits encodes filter params into query string', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listOrgUnits({ parent_ou_id: 'ou-root', q: 'sales' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units?parent_ou_id=ou-root&q=sales',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('listOrgUnits sets tree=true in query string', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listOrgUnits({ tree: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units?tree=true',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getOrgUnit calls GET with encoded ou id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { org_unit: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getOrgUnit('ou-root');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-root',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('createOrgUnit calls POST with ou_id, name, parent_ou_id, block_inheritance', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { org_unit: {} } }), { status: 201 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.createOrgUnit({ ou_id: 'ou-sales', name: 'Sales', parent_ou_id: 'ou-root', block_inheritance: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ou_id: 'ou-sales', name: 'Sales', parent_ou_id: 'ou-root', block_inheritance: true }),
      }),
    );
  });

  it('updateOrgUnit calls PATCH with encoded ou id and body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { org_unit: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.updateOrgUnit('ou-sales', { name: 'Sales v2', parent_ou_id: 'ou-child', block_inheritance: false });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-sales',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sales v2', parent_ou_id: 'ou-child', block_inheritance: false }),
      }),
    );
  });

  it('deleteOrgUnit calls DELETE with encoded ou id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { ou_id: 'ou-empty', status: 'deleted' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.deleteOrgUnit('ou-empty');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-empty',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listOrgUnitUsers calls GET with encoded ou id and include_subtree param', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listOrgUnitUsers('ou-root', { include_subtree: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-root/users?include_subtree=true',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('moveUserToOrgUnit calls PUT with encoded ou id and user id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.moveUserToOrgUnit('ou-sales', 'user-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-sales/users/user-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('listOrgUnitPolicies calls GET with encoded ou id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listOrgUnitPolicies('ou-root');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-root/policies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('attachOrgUnitPolicy calls PUT with encoded ou id, policy id, and enforced body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { attachment: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.attachOrgUnitPolicy('ou-root', 'policy.sales_read', { enforced: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-root/policies/policy.sales_read',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ enforced: true }),
      }),
    );
  });

  it('detachOrgUnitPolicy calls DELETE with encoded ou id and policy id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'detached' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.detachOrgUnitPolicy('ou-root', 'policy.sales_read');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/units/ou-root/policies/policy.sales_read',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('getUserManager calls GET with encoded user id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: {}, manager: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getUserManager('user-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/users/user-1/manager',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('setUserManager calls PUT with encoded user id and report_to_user_id body', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: {} } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.setUserManager('user-1', { report_to_user_id: 'user-mgr' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/users/user-1/manager',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ report_to_user_id: 'user-mgr' }),
      }),
    );
  });

  it('clearUserManager calls DELETE with encoded user id', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { status: 'cleared' } }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.clearUserManager('user-1');

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/users/user-1/manager',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('listUserDirectReports calls GET with encoded user id and recursive param', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listUserDirectReports('user-mgr', { recursive: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/users/user-mgr/direct-reports?recursive=true',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getOrgChart calls GET /api/v1/org/charts', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getOrgChart();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/charts',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getOrgChart encodes query params for root_ou_id, include_users, include_policies', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getOrgChart({ root_ou_id: 'ou-root', include_users: true, include_policies: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/charts?root_ou_id=ou-root&include_users=true&include_policies=true',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getOrgChart omits query string when params are empty', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getOrgChart({});

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/org/charts',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('getAssistantRoleCatalog calls GET /api/v1/catalogs/assistant-roles', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.getAssistantRoleCatalog();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/catalogs/assistant-roles',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('putAssistantRoleCatalog calls PUT /api/v1/catalogs/assistant-roles', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.putAssistantRoleCatalog({ version: 1, roles: [] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/v1/catalogs/assistant-roles',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ version: 1, roles: [] }),
      }),
    );
  });
});
