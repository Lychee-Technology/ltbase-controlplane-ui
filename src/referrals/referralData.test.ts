import { describe, expect, it } from 'vitest';
import {
  parseReferral,
  parseReferralList,
  parseReferralDetail,
  datetimeLocalToMillis,
  millisToDatetimeLocal,
  validateBatchImportJSON,
} from './referralData';
import type { AuthReferral } from './referralData';

describe('parseReferral', () => {
  it('parses a referral record with all fields', () => {
    const result = parseReferral({
      code: 'CODE1',
      project_id: 'proj-1',
      policy_id: 'policy.read',
      used_at: 1700000000000,
      expires_at: 1800000000000,
      disabled: false,
      created_at: 1690000000000,
      updated_at: 1695000000000,
      status: 'available',
    });

    expect(result).toEqual<AuthReferral>({
      code: 'CODE1',
      projectId: 'proj-1',
      policyId: 'policy.read',
      usedAt: 1700000000000,
      expiresAt: 1800000000000,
      disabled: false,
      createdAt: 1690000000000,
      updatedAt: 1695000000000,
      status: 'available',
    });
  });

  it('defaults missing fields', () => {
    const result = parseReferral({});

    expect(result).toEqual<AuthReferral>({
      code: '',
      projectId: '',
      policyId: '',
      usedAt: 0,
      expiresAt: 0,
      disabled: false,
      createdAt: 0,
      updatedAt: 0,
      status: 'available',
    });
  });
});

describe('parseReferralList', () => {
  it('parses a list response with items and total', () => {
    const result = parseReferralList({
      items: [
        { code: 'CODE1', project_id: 'p1', status: 'available' },
        { code: 'CODE2', project_id: 'p1', status: 'used', used_at: 1700000000000 },
      ],
      total: 2,
    });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].code).toBe('CODE1');
    expect(result.items[0].status).toBe('available');
    expect(result.items[1].code).toBe('CODE2');
    expect(result.items[1].status).toBe('used');
  });

  it('handles empty response', () => {
    const result = parseReferralList({ items: [], total: 0 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('handles null/undefined gracefully', () => {
    const result = parseReferralList(null);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('parseReferralDetail', () => {
  it('unwraps data envelope', () => {
    const result = parseReferralDetail({
      data: { code: 'CODE1', project_id: 'p1', status: 'disabled', disabled: true },
    });

    expect(result.code).toBe('CODE1');
    expect(result.status).toBe('disabled');
    expect(result.disabled).toBe(true);
  });
});

describe('datetimeLocalToMillis', () => {
  it('converts a valid datetime-local string to milliseconds', () => {
    const ms = datetimeLocalToMillis('2026-06-26T12:00');
    expect(ms).toBeGreaterThan(0);
    expect(typeof ms).toBe('number');
  });

  it('returns 0 for empty string', () => {
    expect(datetimeLocalToMillis('')).toBe(0);
    expect(datetimeLocalToMillis('  ')).toBe(0);
  });

  it('returns 0 for invalid string', () => {
    expect(datetimeLocalToMillis('not-a-date')).toBe(0);
  });
});

describe('millisToDatetimeLocal', () => {
  it('converts milliseconds to datetime-local format', () => {
    const d = new Date('2026-06-26T12:00:00Z').getTime();
    const result = millisToDatetimeLocal(d);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('returns empty string for 0 or negative', () => {
    expect(millisToDatetimeLocal(0)).toBe('');
    expect(millisToDatetimeLocal(-1)).toBe('');
  });
});

describe('validateBatchImportJSON', () => {
  it('rejects empty input', () => {
    const result = validateBatchImportJSON('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('cannot be empty');
    }
  });

  it('rejects invalid JSON', () => {
    const result = validateBatchImportJSON('not json');
    expect(result.valid).toBe(false);
  });

  it('rejects non-array input', () => {
    const result = validateBatchImportJSON('{}');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('JSON array');
    }
  });

  it('rejects empty array', () => {
    const result = validateBatchImportJSON('[]');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('cannot be empty');
    }
  });

  it('rejects item missing referral_code', () => {
    const result = validateBatchImportJSON('[{}]');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('missing referral_code');
    }
  });

  it('parses valid array with minimal fields', () => {
    const result = validateBatchImportJSON('[{"referral_code":"CODE1"}]');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].referralCode).toBe('CODE1');
      expect(result.items[0].policyId).toBe('');
      expect(result.items[0].expiresAtMillis).toBe(0);
    }
  });

  it('parses valid array with all fields', () => {
    const result = validateBatchImportJSON(
      '[{"referral_code":"CODE1","policy_id":"policy.read","expires_at_ms":1800000000000},{"referral_code":"CODE2"}]',
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.items).toHaveLength(2);
      expect(result.items[0].referralCode).toBe('CODE1');
      expect(result.items[0].policyId).toBe('policy.read');
      expect(result.items[0].expiresAtMillis).toBe(1800000000000);
      expect(result.items[1].referralCode).toBe('CODE2');
    }
  });

  it('rejects invalid expires_at_ms', () => {
    const result = validateBatchImportJSON('[{"referral_code":"CODE1","expires_at_ms":-1}]');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('invalid expires_at_ms');
    }
  });

  it('handles null expires_at_ms gracefully', () => {
    const result = validateBatchImportJSON('[{"referral_code":"CODE1","expires_at_ms":null}]');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.items[0].expiresAtMillis).toBe(0);
    }
  });
});
