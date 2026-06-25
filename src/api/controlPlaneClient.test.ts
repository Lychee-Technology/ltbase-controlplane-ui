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

  it('applyRepair sends confirm:true', async () => {
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
});
