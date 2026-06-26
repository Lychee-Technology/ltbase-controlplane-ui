export interface AuthPolicy {
  policyId: string;
  name: string;
  description: string;
  slug: string;
  externalKey: string;
  document: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface PolicyReferenceEntry {
  kind: 'user' | 'role' | 'ou' | 'referral';
  id: string;
  label: string;
}

export interface PolicyReferenceSummary {
  users: PolicyReferenceEntry[];
  roles: PolicyReferenceEntry[];
  ous: PolicyReferenceEntry[];
  referrals: PolicyReferenceEntry[];
  total: number;
}

export interface PolicyFormValue {
  name: string;
  description: string;
  policyDocument: unknown;
}

export function parsePolicyList(payload: unknown): AuthPolicy[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parsePolicy(item));
}

export function parsePolicy(payload: unknown): AuthPolicy {
  const data = payload as Record<string, unknown>;
  return {
    policyId: String(data.policy_id ?? ''),
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    slug: String(data.slug ?? ''),
    externalKey: String(data.external_key ?? ''),
    document: data.document ?? null,
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  };
}

export function parsePolicyDetail(payload: unknown): AuthPolicy {
  const data = (payload as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const policy = (data?.policy ?? {}) as Record<string, unknown>;
  return parsePolicy(policy);
}

export function validatePolicyDocumentJSON(text: string): { valid: true; parsed: unknown } | { valid: false; message: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, message: 'Policy document cannot be empty' };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, parsed };
  } catch (error: unknown) {
    return { valid: false, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function formatPolicyDocument(document: unknown): string {
  if (document === null || document === undefined) {
    return '';
  }
  if (typeof document === 'string') {
    try {
      return JSON.stringify(JSON.parse(document), null, 2);
    } catch {
      return document;
    }
  }
  try {
    return JSON.stringify(document, null, 2);
  } catch {
    return String(document);
  }
}

export function defaultPolicyDocumentJSON(): string {
  return JSON.stringify({ statements: [] }, null, 2);
}

export function derivePolicyReferences(authConfigPayload: unknown, policy: AuthPolicy): PolicyReferenceSummary {
  const data = (authConfigPayload as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const users = Array.isArray(data?.users) ? data.users : [];
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  const orgUnits = Array.isArray(data?.org_units) ? data.org_units : [];
  const referrals = Array.isArray(data?.referrals) ? data.referrals : [];
  const principalAttachments = Array.isArray(data?.principal_policy_attachments) ? data.principal_policy_attachments : [];
  const ouAttachments = Array.isArray(data?.ou_policy_attachments) ? data.ou_policy_attachments : [];

  const userIndex = new Map<string, string>();
  for (const user of users) {
    const u = user as Record<string, unknown>;
    userIndex.set(String(u.user_id ?? ''), String(u.user_id ?? ''));
  }

  const roleIndex = new Map<string, string>();
  for (const role of roles) {
    const r = role as Record<string, unknown>;
    roleIndex.set(String(r.role_id ?? ''), String(r.name ?? r.role_id ?? ''));
  }

  const ouIndex = new Map<string, string>();
  for (const ou of orgUnits) {
    const o = ou as Record<string, unknown>;
    ouIndex.set(String(o.ou_id ?? ''), String(o.name ?? o.ou_id ?? ''));
  }

  const refUsers: PolicyReferenceEntry[] = [];
  const refRoles: PolicyReferenceEntry[] = [];
  const refOUs: PolicyReferenceEntry[] = [];

  for (const attachment of principalAttachments) {
    const a = attachment as Record<string, unknown>;
    const attachmentPolicyId = String(a.policy_id ?? '');
    if (attachmentPolicyId !== policy.policyId && attachmentPolicyId !== policy.slug) {
      continue;
    }
    const principalType = String(a.principal_type ?? '');
    const principalId = String(a.principal_id ?? '');
    if (principalType === 'user') {
      refUsers.push({ kind: 'user', id: principalId, label: userIndex.get(principalId) ?? principalId });
    } else if (principalType === 'role') {
      refRoles.push({ kind: 'role', id: principalId, label: roleIndex.get(principalId) ?? principalId });
    }
  }

  for (const attachment of ouAttachments) {
    const a = attachment as Record<string, unknown>;
    const attachmentPolicyId = String(a.policy_id ?? '');
    if (attachmentPolicyId !== policy.policyId && attachmentPolicyId !== policy.slug) {
      continue;
    }
    const ouId = String(a.ou_id ?? '');
    refOUs.push({ kind: 'ou', id: ouId, label: ouIndex.get(ouId) ?? ouId });
  }

  const refReferrals: PolicyReferenceEntry[] = [];
  for (const referral of referrals) {
    const r = referral as Record<string, unknown>;
    const referralPolicyId = String(r.policy_id ?? '');
    if (!referralPolicyId) {
      continue;
    }
    if (referralPolicyId !== policy.policyId && referralPolicyId !== policy.slug) {
      continue;
    }
    const code = String(r.code ?? '');
    refReferrals.push({ kind: 'referral', id: code, label: code });
  }

  const total = refUsers.length + refRoles.length + refOUs.length + refReferrals.length;

  return { users: refUsers, roles: refRoles, ous: refOUs, referrals: refReferrals, total };
}
