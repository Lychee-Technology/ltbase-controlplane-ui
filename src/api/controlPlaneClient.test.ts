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
  it('adds bearer auth and JSON headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.putCapabilityCatalog({ capabilities: [] });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/control-plane/v1/catalogs/capabilities',
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

  it('normalizes stable error payloads', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'admin_required', message: 'Admin role required' }), { status: 403 }),
    );
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await expect(client.getStatus()).rejects.toEqual({
      code: 'admin_required',
      message: 'Admin role required',
      details: undefined,
    });
  });

  it('calls workflow endpoints with bearer auth', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ workflows: [] }), { status: 200 }));
    const client = createControlPlaneClient(stack, 'token-123', fetchImpl as unknown as typeof fetch);

    await client.listWorkflows();

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://control-plane.example.com/api/control-plane/v1/workflows',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });
});
