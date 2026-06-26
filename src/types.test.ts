import { describe, expect, it } from 'vitest';
import { formatControlPlaneError, truncateUUID } from './types';

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

describe('truncateUUID', () => {
  it('truncates long strings to 12 chars with ellipsis by default', () => {
    const result = truncateUUID('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    expect(result).toBe('0192e0a1-7c3…');
  });

  it('returns short strings unchanged', () => {
    expect(truncateUUID('short')).toBe('short');
  });

  it('returns string of exactly max length unchanged', () => {
    expect(truncateUUID('123456789012')).toBe('123456789012');
  });

  it('honors a custom max length', () => {
    expect(truncateUUID('0192e0a1-7c3d-7b2a', 8)).toBe('0192e0a1…');
  });
});
