import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, requestJSON } from './http';

function mockCallArgs(fetchImpl: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return (fetchImpl.mock.calls[0] as [string, RequestInit]) ?? ['', {}];
}

describe('requestJSON', () => {
  it('adds bearer auth and JSON headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch);
    const [url, init] = mockCallArgs(fetchImpl);
    expect(url).toBe('https://example.com/status');
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-123');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('sends no Authorization header when accessToken is empty', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await requestJSON('https://example.com', '/status', '', undefined, fetchImpl as unknown as typeof fetch);
    const [, init] = mockCallArgs(fetchImpl);
    const headers = init.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('sets Content-Type for JSON body requests', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await requestJSON(
      'https://example.com',
      '/catalogs',
      'token-123',
      jsonRequest('PUT', { capabilities: [] }),
      fetchImpl as unknown as typeof fetch,
    );
    const [, init] = mockCallArgs(fetchImpl);
    const headers = init.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ capabilities: [] }));
  });

  it('returns parsed JSON on success', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: 'value' }), { status: 200 }));
    const result = await requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ data: 'value' });
  });

  it('returns empty object for empty response body', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 200 }));
    const result = await requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({});
  });

  it('throws ControlPlaneError with code and message on API error', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'forbidden', message: 'admin policy required', request_id: 'req-abc' }), { status: 403 }),
    );
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'forbidden',
      message: 'admin policy required',
      status: 403,
      requestId: 'req-abc',
      details: undefined,
      kind: 'api',
    });
  });

  it('throws ControlPlaneError with kind network and a CORS/connectivity hint for fetch failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toMatchObject({
      code: 'network_error',
      kind: 'network',
    });
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining('CORS'),
      }),
    );
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Failed to fetch'),
      }),
    );
  });

  it('throws ControlPlaneError when an OK response body is malformed JSON', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>not json</html>', { status: 200 }));
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'invalid_response',
      message: 'Control Plane returned a malformed JSON response.',
      status: 200,
      kind: 'api',
    });
  });

  it('preserves details field from API error response', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'invalid_body', message: 'invalid body', details: { field: 'name' } }), { status: 400 }),
    );
    await expect(
      requestJSON('https://example.com', '/status', 'token-123', undefined, fetchImpl as unknown as typeof fetch),
    ).rejects.toEqual({
      code: 'invalid_body',
      message: 'invalid body',
      status: 400,
      requestId: undefined,
      details: { field: 'name' },
      kind: 'api',
    });
  });
});
