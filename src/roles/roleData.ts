export interface AuthRole {
  roleId: string;
  name: string;
  description: string;
  slug: string;
  externalKey: string;
  parentRoleIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RoleFormValue {
  name: string;
  description: string;
  parentRoleIds: string[];
}

export interface RolePolicyAttachment {
  principalType: string;
  principalId: string;
  policyId: string;
  policy: {
    policyId: string;
    name: string;
    description: string;
    slug: string;
    externalKey: string;
    document: unknown;
    createdAt: number;
    updatedAt: number;
  };
}

function pluckData(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  }
  return {};
}

export function parseRole(payload: unknown): AuthRole {
  const data = payload as Record<string, unknown>;
  return {
    roleId: String(data.role_id ?? ''),
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    slug: String(data.slug ?? ''),
    externalKey: String(data.external_key ?? ''),
    parentRoleIds: Array.isArray(data.parent_role_ids) ? data.parent_role_ids.map((id: unknown) => String(id)) : [],
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  };
}

export function parseRoleList(payload: unknown): AuthRole[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseRole(item));
}

export function parseRoleDetail(payload: unknown): AuthRole {
  const role = (pluckData(payload).role ?? {}) as Record<string, unknown>;
  return parseRole(role);
}

export function parseRolePolicyAttachments(payload: unknown): RolePolicyAttachment[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => {
    const a = item as Record<string, unknown>;
    const policyData = (a.policy ?? {}) as Record<string, unknown>;
    return {
      principalType: String(a.principal_type ?? ''),
      principalId: String(a.principal_id ?? ''),
      policyId: String(a.policy_id ?? ''),
      policy: {
        policyId: String(policyData.policy_id ?? ''),
        name: String(policyData.name ?? ''),
        description: String(policyData.description ?? ''),
        slug: String(policyData.slug ?? ''),
        externalKey: String(policyData.external_key ?? ''),
        document: policyData.document ?? null,
        createdAt: Number(policyData.created_at ?? 0),
        updatedAt: Number(policyData.updated_at ?? 0),
      },
    };
  });
}

export function buildParentRoleIndex(roles: AuthRole[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const role of roles) {
    index.set(role.roleId, role.name || role.slug || role.roleId);
  }
  return index;
}

export function truncateUUID(id: string): string {
  if (id.length <= 12) {
    return id;
  }
  return id.slice(0, 12) + '…';
}
