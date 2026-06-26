export type ReferralStatus = 'available' | 'used' | 'expired' | 'disabled';

export interface AuthReferral {
  code: string;
  projectId: string;
  policyId: string;
  usedAt: number;
  expiresAt: number;
  disabled: boolean;
  createdAt: number;
  updatedAt: number;
  status: ReferralStatus;
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

export function parseReferral(payload: unknown): AuthReferral {
  const data = payload as Record<string, unknown>;
  return {
    code: String(data.code ?? ''),
    projectId: String(data.project_id ?? ''),
    policyId: String(data.policy_id ?? ''),
    usedAt: Number(data.used_at ?? 0),
    expiresAt: Number(data.expires_at ?? 0),
    disabled: Boolean(data.disabled),
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
    status: (String(data.status ?? 'available') as ReferralStatus),
  };
}

export interface ReferralListResult {
  items: AuthReferral[];
  total: number;
}

export function parseReferralList(payload: unknown): ReferralListResult {
  if (!payload || typeof payload !== 'object') {
    return { items: [], total: 0 };
  }
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = Number(data.total ?? 0);
  return {
    items: items.map((item: unknown) => parseReferral(item)),
    total,
  };
}

export function parseReferralDetail(payload: unknown): AuthReferral {
  const data = pluckData(payload);
  return parseReferral(data);
}

export function datetimeLocalToMillis(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return 0;
  }
  return d.getTime();
}

export function millisToDatetimeLocal(ms: number): string {
  if (!ms || ms <= 0) {
    return '';
  }
  const d = new Date(ms);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().slice(0, 16);
}

export interface BatchImportItem {
  referralCode: string;
  policyId: string;
  expiresAtMillis: number;
}

export interface BatchImportResult {
  valid: true;
  items: BatchImportItem[];
}

export interface BatchImportError {
  valid: false;
  message: string;
}

export function validateBatchImportJSON(text: string): BatchImportResult | BatchImportError {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, message: 'Import data cannot be empty.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error: unknown) {
    return { valid: false, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
  if (!Array.isArray(parsed)) {
    return { valid: false, message: 'Import data must be a JSON array.' };
  }
  if (parsed.length === 0) {
    return { valid: false, message: 'Import array cannot be empty.' };
  }
  const items: BatchImportItem[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      return { valid: false, message: `Item at index ${i} must be an object.` };
    }
    const referralCode = String(item.referral_code ?? '').trim();
    if (!referralCode) {
      return { valid: false, message: `Item at index ${i} is missing referral_code.` };
    }
    const policyId = String(item.policy_id ?? '').trim();
    const expiresRaw = item.expires_at_ms;
    let expiresAtMillis = 0;
    if (expiresRaw !== undefined && expiresRaw !== null) {
      expiresAtMillis = Number(expiresRaw);
      if (!Number.isFinite(expiresAtMillis) || expiresAtMillis < 0) {
        return { valid: false, message: `Item at index ${i} has invalid expires_at_ms.` };
      }
    }
    items.push({ referralCode, policyId, expiresAtMillis });
  }
  return { valid: true, items };
}
