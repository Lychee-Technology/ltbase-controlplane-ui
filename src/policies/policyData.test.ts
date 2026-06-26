import { describe, expect, it } from 'vitest';
import {
  parsePolicyList,
  parsePolicyDetail,
  parsePolicy,
  validatePolicyDocumentJSON,
  validatePolicyDocumentShape,
  formatPolicyDocument,
  defaultPolicyDocumentJSON,
  derivePolicyReferences,
} from './policyData';
import type { AuthPolicy } from './policyData';

describe('parsePolicyList', () => {
  it('extracts policies from items array', () => {
    const payload = {
      items: [
        {
          policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
          name: 'Sales Read',
          description: 'Read sales data',
          slug: 'policy.sales_read',
          external_key: 'policy-sr-v1',
          document: { statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }] },
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
        {
          policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04',
          name: 'Admin',
          slug: 'admin.controlplane',
          document: null,
          created_at: 0,
          updated_at: 0,
        },
      ],
    };

    const result = parsePolicyList(payload);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      policyId: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
      name: 'Sales Read',
      description: 'Read sales data',
      slug: 'policy.sales_read',
      externalKey: 'policy-sr-v1',
      document: { statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }] },
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    });
    expect(result[1].policyId).toBe('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04');
    expect(result[1].document).toBeNull();
  });

  it('returns empty array when items is missing', () => {
    expect(parsePolicyList({})).toEqual([]);
  });

  it('returns empty array when payload is not an object', () => {
    expect(parsePolicyList(null)).toEqual([]);
  });
});

describe('parsePolicy', () => {
  it('fills defaults for missing fields', () => {
    const result = parsePolicy({});
    expect(result).toEqual({
      policyId: '',
      name: '',
      description: '',
      slug: '',
      externalKey: '',
      document: null,
      createdAt: 0,
      updatedAt: 0,
    });
  });
});

describe('parsePolicyDetail', () => {
  it('extracts policy from data.policy wrapper', () => {
    const payload = {
      data: {
        policy: {
          policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
          name: 'Sales Read',
          slug: 'policy.sales_read',
          document: { statements: [] },
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
      },
    };

    const result = parsePolicyDetail(payload);

    expect(result.policyId).toBe('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    expect(result.name).toBe('Sales Read');
    expect(result.slug).toBe('policy.sales_read');
    expect(result.document).toEqual({ statements: [] });
  });

  it('returns defaults when data is missing', () => {
    const result = parsePolicyDetail({});
    expect(result.policyId).toBe('');
  });
});

describe('validatePolicyDocumentJSON', () => {
  it('accepts valid JSON object', () => {
    const result = validatePolicyDocumentJSON('{ "statements": [] }');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed).toEqual({ statements: [] });
    }
  });

  it('accepts valid JSON array', () => {
    const result = validatePolicyDocumentJSON('[1, 2, 3]');
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validatePolicyDocumentJSON('');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('empty');
    }
  });

  it('rejects whitespace-only string', () => {
    const result = validatePolicyDocumentJSON('   ');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('empty');
    }
  });

  it('rejects malformed JSON', () => {
    const result = validatePolicyDocumentJSON('{ bad }');
    expect(result.valid).toBe(false);
  });
});

describe('validatePolicyDocumentShape', () => {
  it('returns no warnings for a well-formed document', () => {
    const doc = {
      statements: [
        { effect: 'allow', ops: ['read'], schema: 'lead', selector: { filter: { owner: 'eq:1' } } },
        { effect: 'mask', ops: ['read'], schema: 'lead', outcome: { attrs: ['ssn'], action: 'mask' } },
      ],
    };
    expect(validatePolicyDocumentShape(doc)).toEqual([]);
  });

  it('accepts the empty default document', () => {
    expect(validatePolicyDocumentShape({ statements: [] })).toEqual([]);
  });

  it('flags a document without a statements array', () => {
    expect(validatePolicyDocumentShape({ foo: 1 })).toHaveLength(1);
    expect(validatePolicyDocumentShape({ foo: 1 })[0]).toContain('statements');
  });

  it('flags a missing effect', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ ops: ['read'], schema: 'lead', selector: { filter: {} } }],
    });
    expect(warnings.some((w) => w.includes('effect'))).toBe(true);
  });

  it('flags an invalid effect enum', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'grant', ops: ['read'], schema: 'lead', selector: { filter: {} } }],
    });
    expect(warnings.some((w) => w.includes('effect'))).toBe(true);
  });

  it('flags missing or empty ops', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'allow', ops: [], schema: 'lead', selector: { filter: {} } }],
    });
    expect(warnings.some((w) => w.includes('ops'))).toBe(true);
  });

  it('flags ops outside the allowed set', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'allow', ops: ['frobnicate'], schema: 'lead', selector: { filter: {} } }],
    });
    expect(warnings.some((w) => w.includes('ops'))).toBe(true);
  });

  it('flags a missing schema', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'allow', ops: ['read'], selector: { filter: {} } }],
    });
    expect(warnings.some((w) => w.includes('schema'))).toBe(true);
  });

  it('flags allow/deny without a selector', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }],
    });
    expect(warnings.some((w) => w.includes('selector'))).toBe(true);
  });

  it('flags mask without a valid outcome', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [{ effect: 'mask', ops: ['read'], schema: 'lead' }],
    });
    expect(warnings.some((w) => w.includes('outcome'))).toBe(true);
  });

  it('flags a non-object document', () => {
    expect(validatePolicyDocumentShape([1, 2, 3]).length).toBeGreaterThan(0);
    expect(validatePolicyDocumentShape('nope').length).toBeGreaterThan(0);
  });

  it('indexes warnings by statement position', () => {
    const warnings = validatePolicyDocumentShape({
      statements: [
        { effect: 'allow', ops: ['read'], schema: 'lead', selector: { filter: {} } },
        { ops: ['read'], schema: 'lead', selector: { filter: {} } },
      ],
    });
    expect(warnings.some((w) => w.startsWith('statement[1]'))).toBe(true);
  });
});

describe('formatPolicyDocument', () => {
  it('pretty-prints an object', () => {
    const result = formatPolicyDocument({ statements: [{ effect: 'allow' }] });
    expect(result).toBe('{\n  "statements": [\n    {\n      "effect": "allow"\n    }\n  ]\n}');
  });

  it('parses and re-formats a JSON string', () => {
    const result = formatPolicyDocument('{"a":1}');
    expect(result).toBe('{\n  "a": 1\n}');
  });

  it('returns empty string for null', () => {
    expect(formatPolicyDocument(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatPolicyDocument(undefined)).toBe('');
  });

  it('returns original string for invalid JSON string', () => {
    expect(formatPolicyDocument('not json')).toBe('not json');
  });
});

describe('defaultPolicyDocumentJSON', () => {
  it('returns a valid JSON document with empty statements', () => {
    const result = defaultPolicyDocumentJSON();
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ statements: [] });
  });
});

describe('derivePolicyReferences', () => {
  const adminPolicy: AuthPolicy = {
    policyId: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc05',
    name: 'Admin',
    description: '',
    slug: 'admin.controlplane',
    externalKey: '',
    document: null,
    createdAt: 0,
    updatedAt: 0,
  };

  const baseAuthConfig = {
    data: {
      users: [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ],
      roles: [
        { role_id: 'role-admin', name: 'Admins' },
        { role_id: 'role-viewer', name: 'Viewers' },
      ],
      org_units: [
        { ou_id: 'ou-root', name: 'Root' },
        { ou_id: 'ou-eng', name: 'Engineering' },
      ],
      referrals: [
        { code: 'CODE-A', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc05' },
        { code: 'CODE-B', policy_id: 'other-policy' },
        { code: 'CODE-C' },
      ],
      principal_policy_attachments: [
        { principal_type: 'user', principal_id: 'user-1', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc05' },
        { principal_type: 'role', principal_id: 'role-admin', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc05' },
        { principal_type: 'user', principal_id: 'user-3', policy_id: 'other-policy' },
      ],
      ou_policy_attachments: [
        { ou_id: 'ou-root', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc05' },
        { ou_id: 'ou-eng', policy_id: 'other-policy' },
      ],
    },
  };

  it('derives users, roles, OUs, and referrals referencing the policy by durable ID', () => {
    const result = derivePolicyReferences(baseAuthConfig, adminPolicy);

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual({ kind: 'user', id: 'user-1', label: 'user-1' });

    expect(result.roles).toHaveLength(1);
    expect(result.roles[0]).toEqual({ kind: 'role', id: 'role-admin', label: 'Admins' });

    expect(result.ous).toHaveLength(1);
    expect(result.ous[0]).toEqual({ kind: 'ou', id: 'ou-root', label: 'Root' });

    expect(result.referrals).toHaveLength(1);
    expect(result.referrals[0]).toEqual({ kind: 'referral', id: 'CODE-A', label: 'CODE-A' });

    expect(result.total).toBe(4);
  });

  it('matches policy references by slug as well as durable ID', () => {
    const config = {
      data: {
        ...baseAuthConfig.data,
        principal_policy_attachments: [
          { principal_type: 'user', principal_id: 'user-1', policy_id: 'admin.controlplane' },
        ],
      },
    };
    const result = derivePolicyReferences(config, adminPolicy);
    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toBe('user-1');
  });

  it('returns zero references for an unreferenced policy', () => {
    const result = derivePolicyReferences(baseAuthConfig, {
      ...adminPolicy,
      policyId: 'unused-policy',
      slug: '',
    });
    expect(result.total).toBe(0);
    expect(result.users).toHaveLength(0);
    expect(result.roles).toHaveLength(0);
    expect(result.ous).toHaveLength(0);
    expect(result.referrals).toHaveLength(0);
  });

  it('returns empty references when auth config data is missing', () => {
    const result = derivePolicyReferences({}, adminPolicy);
    expect(result.total).toBe(0);
  });

  it('skips referrals that have no policy_id', () => {
    const config = {
      data: {
        referrals: [
          { code: 'CODE-NO-POLICY' },
        ],
      },
    };
    const result = derivePolicyReferences(config, adminPolicy);
    expect(result.referrals).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
