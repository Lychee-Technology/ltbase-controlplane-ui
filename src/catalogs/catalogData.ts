export type CatalogKind = 'capabilities' | 'actionTemplates' | 'assistantRoles' | 'complianceProfile';

export interface CatalogTabDef {
  kind: CatalogKind;
  label: string;
  path: string;
}

export const CATALOG_TABS: CatalogTabDef[] = [
  { kind: 'capabilities', label: 'Capability Catalog', path: '/catalogs/capabilities' },
  { kind: 'actionTemplates', label: 'Action Template Catalog', path: '/catalogs/action-templates' },
  { kind: 'assistantRoles', label: 'Assistant Role Catalog', path: '/catalogs/assistant-roles' },
  { kind: 'complianceProfile', label: 'Compliance Profile', path: '/compliance-profile' },
];

export interface BuiltInRoleRef {
  role: string;
  description: string;
  instruction: string;
}

export const BUILT_IN_ROLES: BuiltInRoleRef[] = [
  {
    role: 'general',
    description: 'a general note-taking assistant',
    instruction: 'Focus on the main subject, context, and key visual elements.',
  },
  {
    role: 'real_estate',
    description: 'a real estate agent assistant',
    instruction: 'Focus on property type, condition, key features, architectural style, or curb appeal.',
  },
  {
    role: 'insurance',
    description: 'an insurance broker assistant',
    instruction: 'Focus on visible risks, potential hazards, property condition, assets shown, or potential liability.',
  },
  {
    role: 'financial',
    description: 'a financial advisor assistant',
    instruction: 'Focus on client goals, risk tolerance, investment strategies, market sentiment, or action items.',
  },
];

export function extractCatalogData(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'data' in payload && typeof (payload as Record<string, unknown>).data === 'string') {
    const raw = (payload as Record<string, unknown>).data as string;
    return formatJSON(raw);
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as Record<string, unknown>).data;
    return formatJSON(data);
  }
  return '';
}

export function formatJSON(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function validateCatalogJSON(
  text: string,
): { valid: true; parsed: unknown } | { valid: false; message: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, message: 'Cannot be empty.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error: unknown) {
    return { valid: false, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, message: 'Data must be a JSON object.' };
  }
  return { valid: true, parsed };
}
