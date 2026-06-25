export interface ProjectStatus {
  projectId: string;
  projectName: string;
  accountId: string;
  apiBaseUrl: string;
  hasRuntimeInfo: boolean;
}

export interface SchemaStatus {
  projectId: string;
  appliedVersion: string;
  appliedSHA: string;
  appliedAt: number;
  publishedVersion: string;
  publishedSHA: string;
}

export interface AuthSummary {
  users: number;
  roles: number;
  policies: number;
  orgUnits: number;
  referrals: number;
  warnings: number;
}

export interface AuthorizationModel {
  canonicalObject: string;
  canonicalPrincipalRelationship: string;
  canonicalOrgRelationship: string;
  permissionStatus: string;
  legacyDataLocation: string;
  policyDependsOnPermission: boolean;
}

export interface OverviewSnapshot {
  project: ProjectStatus;
  schema: SchemaStatus;
  summary: AuthSummary;
  authModel: AuthorizationModel;
}

export function parseProjectStatus(payload: unknown): ProjectStatus {
  const data = pluckData(payload) as Record<string, unknown>;
  return {
    projectId: String(data.project_id ?? ''),
    projectName: String(data.project_name ?? ''),
    accountId: String(data.account_id ?? ''),
    apiBaseUrl: String(data.api_base_url ?? ''),
    hasRuntimeInfo: Boolean(data.has_runtime_info),
  };
}

export function parseSchemaStatus(payload: unknown): SchemaStatus {
  const data = pluckData(payload) as Record<string, unknown>;
  return {
    projectId: String(data.project_id ?? ''),
    appliedVersion: String(data.applied_schema_version ?? ''),
    appliedSHA: String(data.applied_schema_sha256 ?? ''),
    appliedAt: Number(data.applied_schema_at ?? 0),
    publishedVersion: String(data.published_version ?? ''),
    publishedSHA: String(data.published_sha256 ?? ''),
  };
}

export function parseAuthSummary(payload: unknown): { summary: AuthSummary; authModel: AuthorizationModel } {
  const data = pluckData(payload) as Record<string, unknown>;
  const rawSummary = (data.summary ?? {}) as Record<string, unknown>;
  const orgUnits = Array.isArray(data.org_units) ? data.org_units : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  const rawModel = (data.authorization_model ?? {}) as Record<string, unknown>;

  return {
    summary: {
      users: Number(rawSummary.users ?? 0),
      roles: Number(rawSummary.roles ?? 0),
      policies: Number(rawSummary.policies ?? 0),
      orgUnits: orgUnits.length,
      referrals: Number(rawSummary.referrals ?? 0),
      warnings: warnings.length,
    },
    authModel: {
      canonicalObject: String(rawModel.canonical_object ?? ''),
      canonicalPrincipalRelationship: String(rawModel.canonical_principal_relationship ?? ''),
      canonicalOrgRelationship: String(rawModel.canonical_org_relationship ?? ''),
      permissionStatus: String(rawModel.permission_status ?? ''),
      legacyDataLocation: String(rawModel.legacy_data_location ?? ''),
      policyDependsOnPermission: Boolean(rawModel.policy_depends_on_permission),
    },
  };
}

function pluckData(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as Record<string, unknown>).data;
  }
  return {};
}
