export interface AuthUser {
  userId: string;
  provider: string;
  issuer: string;
  externalSub: string;
  referralCode: string;
  primaryOuId: string;
  reportToUserId: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number;
}

export interface RoleOption {
  roleId: string;
  name: string;
  slug: string;
}

export interface PolicyOption {
  policyId: string;
  name: string;
  slug: string;
}

export interface UserRoleAttachment {
  roleId: string;
  name: string;
  slug: string;
}

export interface UserPolicyAttachment {
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

export interface AuthConfigIndexes {
  referralCodeByUserId: Map<string, string>;
  ouLabelById: Map<string, string>;
  userLabelById: Map<string, string>;
}

export interface OuOption {
  ouId: string;
  name: string;
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

export function parseUser(payload: unknown): AuthUser {
  const data = payload as Record<string, unknown>;
  return {
    userId: String(data.user_id ?? ''),
    provider: String(data.provider ?? ''),
    issuer: String(data.issuer ?? ''),
    externalSub: String(data.external_sub ?? ''),
    referralCode: String(data.referral_code ?? ''),
    primaryOuId: String(data.primary_ou_id ?? ''),
    reportToUserId: String(data.report_to_user_id ?? ''),
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
    lastLoginAt: Number(data.last_login_at ?? 0),
  };
}

export function parseUserList(payload: unknown): AuthUser[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseUser(item));
}

export function parseUserDetail(payload: unknown): { user: AuthUser; roles: UserRoleAttachment[] } {
  const data = pluckData(payload);
  const user = parseUser(data.user ?? {});
  const rolesPayload = Array.isArray(data.roles) ? data.roles : [];
  const roles = rolesPayload.map((role: unknown) => {
    const r = role as Record<string, unknown>;
    return {
      roleId: String(r.role_id ?? ''),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
    };
  });
  return { user, roles };
}

export function buildAuthConfigIndexes(authConfigPayload: unknown): AuthConfigIndexes {
  const data = pluckData(authConfigPayload);
  const users = Array.isArray(data.users) ? data.users : [];
  const orgUnits = Array.isArray(data.org_units) ? data.org_units : [];

  const referralCodeByUserId = new Map<string, string>();
  const userLabelById = new Map<string, string>();
  const ouLabelById = new Map<string, string>();

  for (const ou of orgUnits) {
    const o = ou as Record<string, unknown>;
    ouLabelById.set(String(o.ou_id ?? ''), String(o.name ?? o.ou_id ?? ''));
  }

  for (const user of users) {
    const u = user as Record<string, unknown>;
    const uid = String(u.user_id ?? '');
    if (uid) {
      const referralCode = String(u.referral_code ?? '');
      if (referralCode) {
        referralCodeByUserId.set(uid, referralCode);
      }
      userLabelById.set(uid, uid);
    }
  }

  return { referralCodeByUserId, ouLabelById, userLabelById };
}

export function parseRolePickerOptions(payload: unknown): RoleOption[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => {
    const r = item as Record<string, unknown>;
    return {
      roleId: String(r.role_id ?? ''),
      name: String(r.name ?? ''),
      slug: String(r.slug ?? ''),
    };
  });
}

export function parsePolicyPickerOptions(payload: unknown): PolicyOption[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => {
    const p = item as Record<string, unknown>;
    return {
      policyId: String(p.policy_id ?? ''),
      name: String(p.name ?? ''),
      slug: String(p.slug ?? ''),
    };
  });
}

export function parseUserPolicyAttachments(payload: unknown): UserPolicyAttachment[] {
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

export function parseOuPickerOptions(payload: unknown): OuOption[] {
  const data = pluckData(payload);
  const orgUnits = Array.isArray(data.org_units) ? data.org_units : [];
  return orgUnits.map((ou: unknown) => {
    const o = ou as Record<string, unknown>;
    return {
      ouId: String(o.ou_id ?? ''),
      name: String(o.name ?? o.ou_id ?? ''),
    };
  });
}

export function buildUserLabelIndex(users: AuthUser[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const user of users) {
    index.set(user.userId, user.userId);
  }
  return index;
}
