import { describe, expect, it } from 'vitest';
import {
  parseOrgUnit,
  parseOrgUnitList,
  parseOrgUnitDetail,
  parseOrgUnitUsers,
  parseOrgUser,
  parseOrgUnitPolicies,
  parseManagerResult,
  parseManagerFromNotFound,
  parseDirectReports,
  buildOrgTree,
  getDescendantOuIds,
  filterParentOptions,
} from './organizationData';

describe('parseOrgUnit', () => {
  it('parses a full org unit payload', () => {
    const result = parseOrgUnit({
      ou_id: 'ou-root',
      name: 'Root',
      parent_ou_id: '',
      ou_path: '/ou-root',
      block_inheritance: false,
      created_at: 1,
      updated_at: 2,
    });
    expect(result).toEqual({
      ouId: 'ou-root',
      name: 'Root',
      parentOuId: '',
      ouPath: '/ou-root',
      blockInheritance: false,
      createdAt: 1,
      updatedAt: 2,
    });
  });

  it('fills defaults for missing fields', () => {
    const result = parseOrgUnit({});
    expect(result.ouId).toBe('');
    expect(result.name).toBe('');
    expect(result.parentOuId).toBe('');
    expect(result.ouPath).toBe('');
    expect(result.blockInheritance).toBe(false);
    expect(result.createdAt).toBe(0);
  });

  it('treats block_inheritance as boolean', () => {
    expect(parseOrgUnit({ block_inheritance: true }).blockInheritance).toBe(true);
    expect(parseOrgUnit({ block_inheritance: false }).blockInheritance).toBe(false);
    expect(parseOrgUnit({}).blockInheritance).toBe(false);
  });
});

describe('parseOrgUnitList', () => {
  it('extracts units from items array', () => {
    const payload = {
      items: [
        { ou_id: 'ou-root', name: 'Root', parent_ou_id: '', ou_path: '/ou-root', block_inheritance: false, created_at: 1, updated_at: 2 },
        { ou_id: 'ou-child', name: 'Child', parent_ou_id: 'ou-root', ou_path: '/ou-root/ou-child', block_inheritance: true, created_at: 3, updated_at: 4 },
      ],
    };
    const result = parseOrgUnitList(payload);
    expect(result).toHaveLength(2);
    expect(result[0].ouId).toBe('ou-root');
    expect(result[1].ouId).toBe('ou-child');
    expect(result[1].blockInheritance).toBe(true);
  });

  it('returns empty array when items is missing', () => {
    expect(parseOrgUnitList({})).toEqual([]);
    expect(parseOrgUnitList(null)).toEqual([]);
  });
});

describe('parseOrgUnitDetail', () => {
  it('extracts org_unit from data envelope', () => {
    const payload = {
      data: {
        org_unit: { ou_id: 'ou-root', name: 'Root', parent_ou_id: '', ou_path: '/ou-root', block_inheritance: false, created_at: 1, updated_at: 2 },
      },
    };
    const result = parseOrgUnitDetail(payload);
    expect(result.ouId).toBe('ou-root');
    expect(result.name).toBe('Root');
  });

  it('returns defaults when data is missing', () => {
    const result = parseOrgUnitDetail({});
    expect(result.ouId).toBe('');
  });
});

describe('parseOrgUser', () => {
  it('parses a full org user payload', () => {
    const result = parseOrgUser({
      user_id: 'user-1',
      provider: 'google',
      issuer: 'issuer-1',
      external_sub: 'sub-1',
      primary_ou_id: 'ou-root',
      report_to_user_id: 'user-mgr',
      created_at: 1,
      updated_at: 2,
      last_login_at: 3,
    });
    expect(result.userId).toBe('user-1');
    expect(result.provider).toBe('google');
    expect(result.primaryOuId).toBe('ou-root');
    expect(result.reportToUserId).toBe('user-mgr');
  });

  it('fills defaults for missing fields', () => {
    const result = parseOrgUser({});
    expect(result.userId).toBe('');
    expect(result.provider).toBe('');
    expect(result.primaryOuId).toBe('');
    expect(result.reportToUserId).toBe('');
  });
});

describe('parseOrgUnitUsers', () => {
  it('extracts users from items array', () => {
    const payload = {
      items: [
        { user_id: 'user-1', provider: 'google', primary_ou_id: 'ou-root', created_at: 1, updated_at: 2, last_login_at: 3 },
        { user_id: 'user-2', provider: 'github', primary_ou_id: 'ou-root', created_at: 4, updated_at: 5, last_login_at: 6 },
      ],
    };
    const result = parseOrgUnitUsers(payload);
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user-1');
    expect(result[1].userId).toBe('user-2');
  });

  it('returns empty array for missing items', () => {
    expect(parseOrgUnitUsers({})).toEqual([]);
  });
});

describe('parseOrgUnitPolicies', () => {
  it('extracts attachments with nested policy', () => {
    const payload = {
      items: [
        {
          ou_id: 'ou-root',
          policy_id: 'policy-read-id',
          enforced: true,
          created_at: 1,
          updated_at: 2,
          policy: {
            policy_id: 'policy-read-id',
            name: 'Read Policy',
            description: 'Allow read',
            slug: 'policy.read',
            external_key: '',
            document: { statements: [] },
            created_at: 1,
            updated_at: 2,
          },
        },
      ],
    };
    const result = parseOrgUnitPolicies(payload);
    expect(result).toHaveLength(1);
    expect(result[0].ouId).toBe('ou-root');
    expect(result[0].policyId).toBe('policy-read-id');
    expect(result[0].enforced).toBe(true);
    expect(result[0].policy.name).toBe('Read Policy');
  });

  it('returns empty array for missing items', () => {
    expect(parseOrgUnitPolicies({})).toEqual([]);
  });

  it('defaults enforced to false when missing', () => {
    const payload = {
      items: [{ ou_id: 'ou-root', policy_id: 'pol-1', policy: {} }],
    };
    const result = parseOrgUnitPolicies(payload);
    expect(result[0].enforced).toBe(false);
  });
});

describe('parseManagerResult', () => {
  it('extracts user and manager from data envelope', () => {
    const payload = {
      data: {
        user: { user_id: 'user-dev', primary_ou_id: 'ou-child' },
        manager: { user_id: 'user-mgr', primary_ou_id: 'ou-root' },
      },
    };
    const result = parseManagerResult(payload);
    expect(result.user.userId).toBe('user-dev');
    expect(result.manager?.userId).toBe('user-mgr');
  });

  it('returns null manager when manager field is absent', () => {
    const payload = {
      data: {
        user: { user_id: 'user-dev' },
      },
    };
    const result = parseManagerResult(payload);
    expect(result.manager).toBeNull();
  });
});

describe('parseManagerFromNotFound', () => {
  it('preserves the user id and returns a null manager', () => {
    const result = parseManagerFromNotFound('user-1');
    expect(result.user.userId).toBe('user-1');
    expect(result.manager).toBeNull();
  });
});

describe('parseDirectReports', () => {
  it('extracts users from items array', () => {
    const payload = {
      items: [
        { user_id: 'user-dev', primary_ou_id: 'ou-child', created_at: 1, updated_at: 2, last_login_at: 3 },
        { user_id: 'user-platform', primary_ou_id: 'ou-platform', created_at: 4, updated_at: 5, last_login_at: 6 },
      ],
    };
    const result = parseDirectReports(payload);
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user-dev');
    expect(result[1].userId).toBe('user-platform');
  });

  it('returns empty array for missing items', () => {
    expect(parseDirectReports({})).toEqual([]);
  });
});

describe('buildOrgTree', () => {
  it('builds tree from flat unit list', () => {
    const units = [
      { ouId: 'ou-root', name: 'Root', parentOuId: '', ouPath: '/ou-root', blockInheritance: false, createdAt: 1, updatedAt: 2 },
      { ouId: 'ou-child', name: 'Child', parentOuId: 'ou-root', ouPath: '/ou-root/ou-child', blockInheritance: false, createdAt: 3, updatedAt: 4 },
      { ouId: 'ou-grand', name: 'Grand', parentOuId: 'ou-child', ouPath: '/ou-root/ou-child/ou-grand', blockInheritance: false, createdAt: 5, updatedAt: 6 },
    ];
    const tree = buildOrgTree(units);
    expect(tree).toHaveLength(1);
    expect(tree[0].unit.ouId).toBe('ou-root');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].unit.ouId).toBe('ou-child');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].unit.ouId).toBe('ou-grand');
  });

  it('returns empty array for empty list', () => {
    expect(buildOrgTree([])).toEqual([]);
  });

  it('creates multiple root nodes when multiple units have no parent', () => {
    const units = [
      { ouId: 'ou-a', name: 'A', parentOuId: '', ouPath: '/ou-a', blockInheritance: false, createdAt: 1, updatedAt: 2 },
      { ouId: 'ou-b', name: 'B', parentOuId: '', ouPath: '/ou-b', blockInheritance: false, createdAt: 3, updatedAt: 4 },
    ];
    const tree = buildOrgTree(units);
    expect(tree).toHaveLength(2);
    expect(tree[0].unit.ouId).toBe('ou-a');
    expect(tree[1].unit.ouId).toBe('ou-b');
  });
});

describe('getDescendantOuIds', () => {
  it('returns all descendant ids recursively', () => {
    const units = [
      { ouId: 'ou-root', name: '', parentOuId: '', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-child', name: '', parentOuId: 'ou-root', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-grand', name: '', parentOuId: 'ou-child', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-other', name: '', parentOuId: '', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
    ];
    const result = getDescendantOuIds(units, 'ou-root');
    expect(result.has('ou-child')).toBe(true);
    expect(result.has('ou-grand')).toBe(true);
    expect(result.has('ou-other')).toBe(false);
    expect(result.has('ou-root')).toBe(false);
  });

  it('returns empty set for leaf node', () => {
    const units = [
      { ouId: 'ou-root', name: '', parentOuId: '', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-leaf', name: '', parentOuId: 'ou-root', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
    ];
    const result = getDescendantOuIds(units, 'ou-leaf');
    expect(result.size).toBe(0);
  });
});

describe('filterParentOptions', () => {
  it('excludes self and descendants from parent options', () => {
    const units = [
      { ouId: 'ou-root', name: 'Root', parentOuId: '', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-child', name: 'Child', parentOuId: 'ou-root', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-grand', name: 'Grand', parentOuId: 'ou-child', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
    ];
    const options = filterParentOptions(units, 'ou-root');
    expect(options).toHaveLength(0);
  });

  it('excludes descendants but includes siblings and self-parent', () => {
    const units = [
      { ouId: 'ou-root', name: 'Root', parentOuId: '', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-child', name: 'Child', parentOuId: 'ou-root', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
      { ouId: 'ou-grand', name: 'Grand', parentOuId: 'ou-child', ouPath: '', blockInheritance: false, createdAt: 0, updatedAt: 0 },
    ];
    const options = filterParentOptions(units, 'ou-child');
    expect(options).toHaveLength(1);
    expect(options[0].ouId).toBe('ou-root');
  });
});
