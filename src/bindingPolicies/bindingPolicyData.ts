export interface AuthBindingPolicy {
  policyId: string;
  enabled: boolean;
  priority: number;
  slug: string;
  externalKey: string;
  rules: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface BindingPolicyFormValue {
  enabled: boolean;
  priority: number;
  rules: unknown;
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

export function parseBindingPolicyList(payload: unknown): AuthBindingPolicy[] {
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((item: unknown) => parseBindingPolicy(item));
}

export function parseBindingPolicyDetail(payload: unknown): AuthBindingPolicy {
  const bp = (pluckData(payload).binding_policy ?? {}) as Record<string, unknown>;
  return parseBindingPolicy(bp);
}

export function parseBindingPolicy(payload: unknown): AuthBindingPolicy {
  const data = payload as Record<string, unknown>;
  return {
    policyId: String(data.policy_id ?? ''),
    enabled: Boolean(data.enabled),
    priority: Number(data.priority ?? 0),
    slug: String(data.slug ?? ''),
    externalKey: String(data.external_key ?? ''),
    rules: data.rules ?? null,
    createdAt: Number(data.created_at ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  };
}

export function validateBindingRulesJSON(text: string): { valid: true; parsed: unknown } | { valid: false; message: string } {
  const trimmed = text.trim();
  if (!trimmed || trimmed === 'null') {
    return { valid: false, message: 'Rules cannot be empty or null' };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, parsed };
  } catch (error: unknown) {
    return { valid: false, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function formatBindingRules(rules: unknown): string {
  if (rules === null || rules === undefined) {
    return '';
  }
  if (typeof rules === 'string') {
    try {
      return JSON.stringify(JSON.parse(rules), null, 2);
    } catch {
      return rules;
    }
  }
  try {
    return JSON.stringify(rules, null, 2);
  } catch {
    return String(rules);
  }
}

export function defaultBindingRulesJSON(): string {
  return '[]';
}

export function summarizeBindingRules(rules: unknown): string {
  if (rules === null || rules === undefined) {
    return '—';
  }
  let parsed: unknown = rules;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return String(rules).slice(0, 60);
    }
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return '[]';
    }
    return `[${parsed.length} rule${parsed.length === 1 ? '' : 's'}]`;
  }
  if (typeof parsed === 'object') {
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}}`;
  }
  return String(rules).slice(0, 60);
}
