export interface AuthOrgUnit {
  ouId: string;
  name: string;
  parentOuId: string;
  ouPath: string;
  blockInheritance: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OrgUnitFormValue {
  name: string;
  parentOuId: string;
  blockInheritance: boolean;
}

export interface OrgUnitCreateValue extends OrgUnitFormValue {
  ouId: string;
}

export interface OrgUnitPolicyAttachment {
  ouId: string;
  policyId: string;
  enforced: boolean;
  createdAt: number;
  updatedAt: number;
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

export interface ManagerResult {
  user: AuthOrgUser;
  manager: AuthOrgUser | null;
}

export interface AuthOrgUser {
  userId: string;
  provider: string;
  issuer: string;
  externalSub: string;
  primaryOuId: string;
  reportToUserId: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number;
}

export interface OrgTree {
  unit: AuthOrgUnit;
  children: OrgTree[];
}

// Control-plane responses come in two envelope shapes: list endpoints return a
// top-level `{ items: [...] }`, while detail endpoints wrap the entity under
// `{ data: { <entity>: {...} } }`. pluckData unwraps the `data` envelope.
function pluckData(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  }
  return {};
}

export function parseOrgUnit(payload: unknown): AuthOrgUnit {
  const data = payload as Record<string, unknown>;
  return {
    ouId: String(data.ou_id ?? ''),
    name: String(data.name ?? ''),
    parentOuId: String(data.parent_ou_id ?? ''),
    ouPath: String(data.ou_path ?? ''),
    blockInheritance: data.block_inheritance === true,
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  };
}

export function parseOrgUnitList(payload: unknown): AuthOrgUnit[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseOrgUnit(item));
}

export function parseOrgUnitDetail(payload: unknown): AuthOrgUnit {
  const orgUnit = (pluckData(payload).org_unit ?? {}) as Record<string, unknown>;
  return parseOrgUnit(orgUnit);
}

export function parseOrgUnitUsers(payload: unknown): AuthOrgUser[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseOrgUser(item));
}

export function parseOrgUser(payload: unknown): AuthOrgUser {
  const data = payload as Record<string, unknown>;
  return {
    userId: String(data.user_id ?? ''),
    provider: String(data.provider ?? ''),
    issuer: String(data.issuer ?? ''),
    externalSub: String(data.external_sub ?? ''),
    primaryOuId: String(data.primary_ou_id ?? ''),
    reportToUserId: String(data.report_to_user_id ?? ''),
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
    lastLoginAt: Number(data.last_login_at ?? 0),
  };
}

export function parseOrgUnitPolicies(payload: unknown): OrgUnitPolicyAttachment[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => {
    const a = item as Record<string, unknown>;
    const policyData = (a.policy ?? {}) as Record<string, unknown>;
    return {
      ouId: String(a.ou_id ?? ''),
      policyId: String(a.policy_id ?? ''),
      enforced: a.enforced === true,
      createdAt: Number(a.created_at ?? 0),
      updatedAt: Number(a.updated_at ?? 0),
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

export function parseManagerResult(payload: unknown): ManagerResult {
  const data = pluckData(payload);
  const userRaw = (data.user ?? {}) as Record<string, unknown>;
  const managerRaw = data.manager ? (data.manager as Record<string, unknown>) : null;
  const user = parseOrgUser(userRaw);
  const manager = managerRaw ? parseOrgUser(managerRaw) : null;
  return { user, manager };
}

export function parseManagerFromNotFound(userId: string): ManagerResult {
  return { user: parseOrgUser({ user_id: userId }), manager: null };
}

export function parseDirectReports(payload: unknown): AuthOrgUser[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseOrgUser(item));
}

export function buildOrgTree(units: AuthOrgUnit[]): OrgTree[] {
  const byParent = new Map<string, AuthOrgUnit[]>();
  for (const unit of units) {
    const parentId = unit.parentOuId || '__root__';
    if (!byParent.has(parentId)) {
      byParent.set(parentId, []);
    }
    byParent.get(parentId)!.push(unit);
  }
  function buildChildren(parentId: string): OrgTree[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((unit) => ({
      unit,
      children: buildChildren(unit.ouId),
    }));
  }
  return buildChildren('__root__');
}

export function getDescendantOuIds(units: AuthOrgUnit[], ouId: string): Set<string> {
  const childMap = new Map<string, string[]>();
  for (const unit of units) {
    if (unit.parentOuId) {
      if (!childMap.has(unit.parentOuId)) {
        childMap.set(unit.parentOuId, []);
      }
      childMap.get(unit.parentOuId)!.push(unit.ouId);
    }
  }
  const result = new Set<string>();
  const stack = [ouId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = childMap.get(current) ?? [];
    for (const child of children) {
      result.add(child);
      stack.push(child);
    }
  }
  return result;
}

export function filterParentOptions(units: AuthOrgUnit[], currentOuId: string): AuthOrgUnit[] {
  const descendants = getDescendantOuIds(units, currentOuId);
  descendants.add(currentOuId);
  return units.filter((u) => !descendants.has(u.ouId));
}

export interface OrgChartPolicyAttachment {
  ouId: string;
  policyId: string;
  enforced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OrgChartReadModel {
  rootOuId: string;
  orgUnits: AuthOrgUnit[];
  users: AuthOrgUser[];
  policyAttachments: OrgChartPolicyAttachment[];
}

export interface OrgChartNode {
  unit: AuthOrgUnit;
  children: OrgChartNode[];
  users: AuthOrgUser[];
  policyAttachments: OrgChartPolicyAttachment[];
}

export function parseOrgChartPolicyAttachment(payload: unknown): OrgChartPolicyAttachment {
  const data = payload as Record<string, unknown>;
  return {
    ouId: String(data.ou_id ?? ''),
    policyId: String(data.policy_id ?? ''),
    enforced: data.enforced === true,
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  };
}

export function parseOrgChart(payload: unknown): OrgChartReadModel {
  const data = pluckData(payload);
  const orgUnits = Array.isArray(data.org_units) ? data.org_units : [];
  const users = Array.isArray(data.users) ? data.users : [];
  const policyAttachments = Array.isArray(data.policy_attachments) ? data.policy_attachments : [];

  return {
    rootOuId: String(data.root_ou_id ?? ''),
    orgUnits: orgUnits.map((u: unknown) => parseOrgUnit(u)),
    users: users.map((u: unknown) => parseOrgUser(u)),
    policyAttachments: policyAttachments.map((a: unknown) => parseOrgChartPolicyAttachment(a)),
  };
}

export function buildOrgChartTree(model: OrgChartReadModel): OrgChartNode[] {
  const byParent = new Map<string, AuthOrgUnit[]>();
  for (const unit of model.orgUnits) {
    const key = unit.parentOuId || '__root__';
    if (!byParent.has(key)) {
      byParent.set(key, []);
    }
    byParent.get(key)!.push(unit);
  }

  const userByOuId = new Map<string, AuthOrgUser[]>();
  for (const user of model.users) {
    const key = user.primaryOuId;
    if (!userByOuId.has(key)) {
      userByOuId.set(key, []);
    }
    userByOuId.get(key)!.push(user);
  }

  const policiesByOuId = new Map<string, OrgChartPolicyAttachment[]>();
  for (const attachment of model.policyAttachments) {
    const key = attachment.ouId;
    if (!policiesByOuId.has(key)) {
      policiesByOuId.set(key, []);
    }
    policiesByOuId.get(key)!.push(attachment);
  }

  function buildChildren(parentId: string): OrgChartNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((unit) => ({
      unit,
      children: buildChildren(unit.ouId),
      users: userByOuId.get(unit.ouId) ?? [],
      policyAttachments: policiesByOuId.get(unit.ouId) ?? [],
    }));
  }

  return buildChildren('__root__');
}
