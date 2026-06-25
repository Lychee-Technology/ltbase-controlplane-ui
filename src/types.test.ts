import { describe, expect, it } from 'vitest';
import { formatControlPlaneError } from './types';

describe('formatControlPlaneError', () => {
  it('formats ControlPlaneError with code, message, requestId', () => {
    const result = formatControlPlaneError({
      code: 'forbidden',
      message: 'admin policy required',
      requestId: 'req-abc',
      kind: 'api',
    });
    expect(result).toBe('forbidden: admin policy required: [req-abc]');
  });

  it('formats ControlPlaneError without requestId', () => {
    const result = formatControlPlaneError({
      code: 'network_error',
      message: 'Failed to fetch',
      kind: 'network',
    });
    expect(result).toBe('network_error: Failed to fetch');
  });

  it('formats Error instance', () => {
    const result = formatControlPlaneError(new Error('token exchange failed: 401'));
    expect(result).toBe('token exchange failed: 401');
  });

  it('formats string error', () => {
    expect(formatControlPlaneError('something went wrong')).toBe('something went wrong');
  });

  it('formats unknown error', () => {
    expect(formatControlPlaneError(null)).toBe('Unknown error');
    expect(formatControlPlaneError(undefined)).toBe('Unknown error');
    expect(formatControlPlaneError(42)).toBe('Unknown error');
  });
});
