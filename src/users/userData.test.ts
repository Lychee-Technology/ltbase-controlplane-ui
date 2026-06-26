import { describe, expect, it } from 'vitest';
import {
  parseUserList,
  parseUser,
  parseUserDetail,
  buildAuthConfigIndexes,
  parseRolePickerOptions,
  parsePolicyPickerOptions,
  parseUserPolicyAttachments,
  parseOuPickerOptions,
} from './userData';

describe('parseUser', () => {
  it('parses a full user payload', () => {
    const result = parseUser({
      user_id: 'user-1',
      provider: 'google',
      issuer: 'issuer-1',
      external_sub: 'sub-1',
      referral_code: 'REF1',
      primary_ou_id: 'ou-root',
      report_to_user_id: 'user-mgr',
      created_at: 1760000000000,
      updated_at: 1760000000000,
      last_login_at: 1760000000000,
    });

    expect(result).toEqual({
      userId: 'user-1',
      provider: 'google',
      issuer: 'issuer-1',
      externalSub: 'sub-1',
      referralCode: 'REF1',
      primaryOuId: 'ou-root',
      reportToUserId: 'user-mgr',
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
      lastLoginAt: 1760000000000,
    });
  });

  it('fills defaults for missing fields', () => {
    const result = parseUser({});
    expect(result.userId).toBe('');
    expect(result.provider).toBe('');
    expect(result.primaryOuId).toBe('');
    expect(result.reportToUserId).toBe('');
    expect(result.createdAt).toBe(0);
  });
});

describe('parseUserList', () => {
  it('extracts users from items array', () => {
    const payload = {
      items: [
        { user_id: 'user-1', provider: 'google', primary_ou_id: 'ou-root', created_at: 1, updated_at: 2, last_login_at: 3 },
        { user_id: 'user-2', provider: 'github', primary_ou_id: 'ou-child', created_at: 4, updated_at: 5, last_login_at: 6 },
      ],
    };

    const result = parseUserList(payload);

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user-1');
    expect(result[0].provider).toBe('google');
    expect(result[1].userId).toBe('user-2');
  });

  it('returns empty array when items is missing', () => {
    expect(parseUserList({})).toEqual([]);
  });

  it('returns empty array when payload is not an object', () => {
    expect(parseUserList(null)).toEqual([]);
  });
});

describe('parseUserDetail', () => {
  it('extracts user and roles from data envelope', () => {
    const payload = {
      data: {
        user: {
          user_id: 'user-1',
          provider: 'google',
          issuer: 'issuer-1',
          external_sub: 'sub-1',
          primary_ou_id: 'ou-root',
          report_to_user_id: '',
          created_at: 1760000000000,
          updated_at: 1760000000000,
          last_login_at: 1760000000000,
        },
        roles: [
          { role_id: 'role-admin', name: 'Admin', slug: 'role.admin' },
          { role_id: 'role-viewer', name: 'Viewer', slug: 'role.viewer' },
        ],
      },
    };

    const result = parseUserDetail(payload);

    expect(result.user.userId).toBe('user-1');
    expect(result.user.provider).toBe('google');
    expect(result.roles).toHaveLength(2);
    expect(result.roles[0]).toEqual({ roleId: 'role-admin', name: 'Admin', slug: 'role.admin' });
    expect(result.roles[1]).toEqual({ roleId: 'role-viewer', name: 'Viewer', slug: 'role.viewer' });
  });

  it('returns defaults when data is missing', () => {
    const result = parseUserDetail({});
    expect(result.user.userId).toBe('');
    expect(result.roles).toEqual([]);
  });

  it('handles missing roles array', () => {
    const payload = { data: { user: { user_id: 'user-1' } } };
    const result = parseUserDetail(payload);
    expect(result.roles).toEqual([]);
  });
});

describe('buildAuthConfigIndexes', () => {
  it('builds referral codes, OU labels, and user labels from auth config', () => {
    const payload = {
      data: {
        users: [
          { user_id: 'user-1', referral_code: 'REF1' },
          { user_id: 'user-2', referral_code: '' },
          { user_id: 'user-3' },
        ],
        org_units: [
          { ou_id: 'ou-root', name: 'Root' },
          { ou_id: 'ou-child', name: 'Child Team' },
        ],
      },
    };

    const result = buildAuthConfigIndexes(payload);

    expect(result.referralCodeByUserId.get('user-1')).toBe('REF1');
    expect(result.referralCodeByUserId.get('user-2')).toBeUndefined();
    expect(result.referralCodeByUserId.get('user-3')).toBeUndefined();
    expect(result.ouLabelById.get('ou-root')).toBe('Root');
    expect(result.ouLabelById.get('ou-child')).toBe('Child Team');
    expect(result.ouLabelById.get('ou-missing')).toBeUndefined();
    expect(result.userLabelById.has('user-1')).toBe(true);
    expect(result.userLabelById.has('user-2')).toBe(true);
  });

  it('handles missing data', () => {
    const result = buildAuthConfigIndexes({});
    expect(result.referralCodeByUserId.size).toBe(0);
    expect(result.ouLabelById.size).toBe(0);
    expect(result.userLabelById.size).toBe(0);
  });
});

describe('parseRolePickerOptions', () => {
  it('maps role list items to id/name/slug options', () => {
    const payload = {
      items: [
        { role_id: 'role-admin', name: 'Admin', slug: 'role.admin' },
        { role_id: 'role-viewer', name: 'Viewer', slug: 'role.viewer' },
      ],
    };
    expect(parseRolePickerOptions(payload)).toEqual([
      { roleId: 'role-admin', name: 'Admin', slug: 'role.admin' },
      { roleId: 'role-viewer', name: 'Viewer', slug: 'role.viewer' },
    ]);
  });

  it('returns empty array when items is missing', () => {
    expect(parseRolePickerOptions({})).toEqual([]);
    expect(parseRolePickerOptions(null)).toEqual([]);
  });
});

describe('parsePolicyPickerOptions', () => {
  it('maps policy list items to id/name/slug options', () => {
    const payload = {
      items: [
        { policy_id: 'pol-1', name: 'Reader', slug: 'policy.reader' },
        { policy_id: 'pol-2', name: 'Writer', slug: 'policy.writer' },
      ],
    };
    expect(parsePolicyPickerOptions(payload)).toEqual([
      { policyId: 'pol-1', name: 'Reader', slug: 'policy.reader' },
      { policyId: 'pol-2', name: 'Writer', slug: 'policy.writer' },
    ]);
  });

  it('returns empty array when items is missing', () => {
    expect(parsePolicyPickerOptions({})).toEqual([]);
  });
});

describe('parseUserPolicyAttachments', () => {
  it('extracts attachments with nested policy', () => {
    const payload = {
      items: [
        {
          principal_type: 'user',
          principal_id: 'user-1',
          policy_id: 'policy-read-id',
          policy: {
            policy_id: 'policy-read-id',
            name: 'Read Policy',
            description: 'Allow read',
            slug: 'policy.read',
            external_key: '',
            document: { statements: [] },
            created_at: 1760000000000,
            updated_at: 1760000000000,
          },
        },
      ],
    };

    const result = parseUserPolicyAttachments(payload);

    expect(result).toHaveLength(1);
    expect(result[0].policyId).toBe('policy-read-id');
    expect(result[0].principalType).toBe('user');
    expect(result[0].policy.name).toBe('Read Policy');
  });

  it('returns empty array for missing items', () => {
    expect(parseUserPolicyAttachments({})).toEqual([]);
  });

  it('fills policy defaults for missing fields', () => {
    const payload = {
      items: [
        { principal_type: 'user', principal_id: 'user-1', policy_id: 'policy-id', policy: {} },
      ],
    };
    const result = parseUserPolicyAttachments(payload);
    expect(result[0].policy.policyId).toBe('');
    expect(result[0].policy.name).toBe('');
    expect(result[0].policy.document).toBeNull();
  });
});

describe('parseOuPickerOptions', () => {
  it('extracts OU options from auth config', () => {
    const payload = {
      data: {
        org_units: [
          { ou_id: 'ou-root', name: 'Root' },
          { ou_id: 'ou-child', name: 'Child' },
        ],
      },
    };
    expect(parseOuPickerOptions(payload)).toEqual([
      { ouId: 'ou-root', name: 'Root' },
      { ouId: 'ou-child', name: 'Child' },
    ]);
  });

  it('falls back to ou_id when name is missing', () => {
    const payload = {
      data: {
        org_units: [{ ou_id: 'ou-root' }],
      },
    };
    expect(parseOuPickerOptions(payload)).toEqual([{ ouId: 'ou-root', name: 'ou-root' }]);
  });

  it('returns empty array when data is missing', () => {
    expect(parseOuPickerOptions({})).toEqual([]);
  });
});
