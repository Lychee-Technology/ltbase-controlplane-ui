import { describe, expect, it } from 'vitest';
import {
  parseRoleList,
  parseRoleDetail,
  parseRole,
  parseRolePolicyAttachments,
  buildParentRoleIndex,
  truncateUUID,
} from './roleData';
import type { AuthRole } from './roleData';

describe('parseRoleList', () => {
  it('extracts roles from items array', () => {
    const payload = {
      items: [
        {
          role_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
          name: 'Admin',
          description: 'System administrator',
          slug: 'role.admin',
          external_key: 'rk-admin',
          parent_role_ids: [],
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
        {
          role_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04',
          name: 'Viewer',
          slug: 'role.viewer',
          parent_role_ids: ['0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03'],
          created_at: 0,
          updated_at: 0,
        },
      ],
    };

    const result = parseRoleList(payload);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      roleId: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
      name: 'Admin',
      description: 'System administrator',
      slug: 'role.admin',
      externalKey: 'rk-admin',
      parentRoleIds: [],
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    });
    expect(result[1].parentRoleIds).toEqual(['0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03']);
  });

  it('returns empty array when items is missing', () => {
    expect(parseRoleList({})).toEqual([]);
  });

  it('returns empty array when payload is not an object', () => {
    expect(parseRoleList(null)).toEqual([]);
  });
});

describe('parseRole', () => {
  it('fills defaults for missing fields', () => {
    const result = parseRole({});
    expect(result).toEqual({
      roleId: '',
      name: '',
      description: '',
      slug: '',
      externalKey: '',
      parentRoleIds: [],
      createdAt: 0,
      updatedAt: 0,
    });
  });

  it('converts non-array parent_role_ids to empty array', () => {
    const result = parseRole({ parent_role_ids: 'not-an-array' });
    expect(result.parentRoleIds).toEqual([]);
  });
});

describe('parseRoleDetail', () => {
  it('extracts role from data.role wrapper', () => {
    const payload = {
      data: {
        role: {
          role_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
          name: 'Admin',
          slug: 'role.admin',
          parent_role_ids: [],
          created_at: 1760000000000,
          updated_at: 1760000000000,
        },
      },
    };

    const result = parseRoleDetail(payload);

    expect(result.roleId).toBe('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    expect(result.name).toBe('Admin');
    expect(result.slug).toBe('role.admin');
  });

  it('returns defaults when data is missing', () => {
    const result = parseRoleDetail({});
    expect(result.roleId).toBe('');
  });
});

describe('parseRolePolicyAttachments', () => {
  it('extracts attachments from items array', () => {
    const payload = {
      items: [
        {
          principal_type: 'role',
          principal_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
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

    const result = parseRolePolicyAttachments(payload);

    expect(result).toHaveLength(1);
    expect(result[0].policyId).toBe('policy-read-id');
    expect(result[0].policy.name).toBe('Read Policy');
    expect(result[0].policy.policyId).toBe('policy-read-id');
  });

  it('returns empty array for missing items', () => {
    expect(parseRolePolicyAttachments({})).toEqual([]);
  });

  it('fills policy defaults for missing fields', () => {
    const payload = {
      items: [
        {
          principal_type: 'role',
          principal_id: 'role-id',
          policy_id: 'policy-id',
          policy: {},
        },
      ],
    };

    const result = parseRolePolicyAttachments(payload);

    expect(result[0].policy.policyId).toBe('');
    expect(result[0].policy.name).toBe('');
    expect(result[0].policy.document).toBeNull();
  });
});

describe('buildParentRoleIndex', () => {
  it('indexes roles by roleId with name as label', () => {
    const roles: AuthRole[] = [
      { roleId: 'id-1', name: 'Admin', description: '', slug: '', externalKey: '', parentRoleIds: [], createdAt: 0, updatedAt: 0 },
      { roleId: 'id-2', name: '', description: '', slug: 'role.viewer', externalKey: '', parentRoleIds: [], createdAt: 0, updatedAt: 0 },
      { roleId: 'id-3', name: '', description: '', slug: '', externalKey: '', parentRoleIds: [], createdAt: 0, updatedAt: 0 },
    ];

    const index = buildParentRoleIndex(roles);

    expect(index.get('id-1')).toBe('Admin');
    expect(index.get('id-2')).toBe('role.viewer');
    expect(index.get('id-3')).toBe('id-3');
  });
});

describe('truncateUUID', () => {
  it('truncates long strings to 12 chars with ellipsis', () => {
    const result = truncateUUID('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    expect(result).toBe('0192e0a1-7c3…');
  });

  it('returns short strings unchanged', () => {
    expect(truncateUUID('short')).toBe('short');
  });

  it('returns 12-char string unchanged', () => {
    const id = '123456789012';
    expect(truncateUUID(id)).toBe('123456789012');
  });
});
