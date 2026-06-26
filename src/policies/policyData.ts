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

// Policy endpoints return different envelopes: `listPolicies` responds with a
// top-level `{ items }`, while detail/create and the auth config nest payloads
// under `data`. `pluckData` unwraps the `data` wrapper (mirroring
// overview/overviewData.ts); the list parser reads the top level directly.
function pluckData(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      return data as Record<string, unknown>;
    }
  }
  return {};
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
  const policy = (pluckData(payload).policy ?? {}) as Record<string, unknown>;
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

const VALID_EFFECTS = ['allow', 'deny', 'mask'];
const VALID_OPS = ['create', 'read', 'update', 'delete', '*'];

// Checks a parsed policy document against the statement schema in rfc/CN/aaa.md
// §6.2–6.5 and returns human-readable warnings (empty array = clean). These are
// advisory only — the form surfaces them but does not block submission, since the
// special `admin.controlplane` policy and forward-compatible documents may not
// follow the statement shape.
export function validatePolicyDocumentShape(parsed: unknown): string[] {
  const warnings: string[] = [];
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return ['Document should be an object with a "statements" array.'];
  }
  const doc = parsed as Record<string, unknown>;
  if (!('statements' in doc)) {
    return ['Document is missing a "statements" array.'];
  }
  if (!Array.isArray(doc.statements)) {
    return ['"statements" must be an array.'];
  }

  doc.statements.forEach((raw, index) => {
    const label = `statement[${index}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warnings.push(`${label}: must be an object.`);
      return;
    }
    const stmt = raw as Record<string, unknown>;

    const effect = stmt.effect;
    if (typeof effect !== 'string' || !VALID_EFFECTS.includes(effect)) {
      warnings.push(`${label}: "effect" must be one of allow, deny, mask.`);
    }

    if (!Array.isArray(stmt.ops) || stmt.ops.length === 0) {
      warnings.push(`${label}: "ops" must be a non-empty array.`);
    } else {
      const invalidOps = stmt.ops.filter(
        (op) => typeof op !== 'string' || !VALID_OPS.includes(op),
      );
      if (invalidOps.length > 0) {
        warnings.push(`${label}: "ops" may only contain create, read, update, delete, or *.`);
      }
    }

    if (typeof stmt.schema !== 'string' || !stmt.schema.trim()) {
      warnings.push(`${label}: "schema" must be a non-empty string.`);
    }

    if (effect === 'allow' || effect === 'deny') {
      const selector = stmt.selector as Record<string, unknown> | undefined;
      const hasSelector =
        !!selector &&
        typeof selector === 'object' &&
        (selector.resource_id !== undefined || selector.filter !== undefined);
      if (!hasSelector) {
        warnings.push(`${label}: ${effect} requires a "selector" with "resource_id" or "filter".`);
      }
    }

    if (effect === 'mask') {
      const outcome = stmt.outcome as Record<string, unknown> | undefined;
      const validOutcome =
        !!outcome &&
        typeof outcome === 'object' &&
        Array.isArray(outcome.attrs) &&
        outcome.action === 'mask';
      if (!validOutcome) {
        warnings.push(`${label}: mask requires "outcome" with "attrs" and action "mask".`);
      }
    }
  });

  return warnings;
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
  const data = pluckData(authConfigPayload);
  const users = Array.isArray(data.users) ? data.users : [];
  const roles = Array.isArray(data.roles) ? data.roles : [];
  const orgUnits = Array.isArray(data.org_units) ? data.org_units : [];
  const referrals = Array.isArray(data.referrals) ? data.referrals : [];
  const principalAttachments = Array.isArray(data.principal_policy_attachments) ? data.principal_policy_attachments : [];
  const ouAttachments = Array.isArray(data.ou_policy_attachments) ? data.ou_policy_attachments : [];

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
