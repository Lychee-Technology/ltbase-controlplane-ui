import { describe, expect, it } from 'vitest';
import {
  parseProjectStatus,
  parseSchemaStatus,
  parseAuthSummary,
} from './overviewData';

describe('parseProjectStatus', () => {
  it('extracts all fields from a valid status payload', () => {
    const payload = {
      data: {
        project_id: '11111111-1111-4111-8111-111111111111',
        project_name: 'test-project',
        account_id: '999999999999',
        api_base_url: 'https://api.example.com',
        has_runtime_info: true,
      },
    };

    const result = parseProjectStatus(payload);

    expect(result.projectId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.projectName).toBe('test-project');
    expect(result.accountId).toBe('999999999999');
    expect(result.apiBaseUrl).toBe('https://api.example.com');
    expect(result.hasRuntimeInfo).toBe(true);
  });

  it('returns empty defaults when data is missing', () => {
    const result = parseProjectStatus({});

    expect(result.projectId).toBe('');
    expect(result.projectName).toBe('');
    expect(result.accountId).toBe('');
    expect(result.apiBaseUrl).toBe('');
    expect(result.hasRuntimeInfo).toBe(false);
  });

  it('treats has_runtime_info as false when absent', () => {
    const payload = { data: { project_id: 'abc' } };

    const result = parseProjectStatus(payload);

    expect(result.hasRuntimeInfo).toBe(false);
  });
});

describe('parseSchemaStatus', () => {
  it('extracts applied and published schema fields', () => {
    const payload = {
      data: {
        project_id: '11111111-1111-4111-8111-111111111111',
        applied_schema_version: 'v1.2.3',
        applied_schema_sha256: 'abc123def4567890',
        applied_schema_at: 1700000000000,
        published_version: 'v1.2.0',
        published_sha256: 'fed9876543210cba',
      },
    };

    const result = parseSchemaStatus(payload);

    expect(result.appliedVersion).toBe('v1.2.3');
    expect(result.appliedSHA).toBe('abc123def4567890');
    expect(result.appliedAt).toBe(1700000000000);
    expect(result.publishedVersion).toBe('v1.2.0');
    expect(result.publishedSHA).toBe('fed9876543210cba');
  });

  it('returns empty strings and 0 for missing fields', () => {
    const result = parseSchemaStatus({});

    expect(result.appliedVersion).toBe('');
    expect(result.appliedSHA).toBe('');
    expect(result.appliedAt).toBe(0);
    expect(result.publishedVersion).toBe('');
    expect(result.publishedSHA).toBe('');
  });
});

describe('parseAuthSummary', () => {
  it('extracts summary counts and authorization model', () => {
    const payload = {
      data: {
        summary: {
          users: 5,
          roles: 3,
          policies: 2,
          binding_policies: 1,
          principal_policies: 4,
          ou_policies: 1,
          referrals: 2,
          warnings: 1,
        },
        org_units: [{}, {}, {}],
        warnings: [{ code: 'w1', message: 'warn' }],
        authorization_model: {
          canonical_object: 'policy',
          canonical_principal_relationship: 'principal_policy_attachment',
          canonical_org_relationship: 'ou_policy_attachment',
          permission_status: 'legacy_compatibility',
          legacy_data_location: 'internal_or_migration_output_only',
          policy_depends_on_permission: false,
        },
      },
    };

    const { summary, authModel } = parseAuthSummary(payload);

    expect(summary.users).toBe(5);
    expect(summary.roles).toBe(3);
    expect(summary.policies).toBe(2);
    expect(summary.orgUnits).toBe(3);
    expect(summary.referrals).toBe(2);
    expect(summary.warnings).toBe(1);

    expect(authModel.canonicalObject).toBe('policy');
    expect(authModel.canonicalPrincipalRelationship).toBe('principal_policy_attachment');
    expect(authModel.canonicalOrgRelationship).toBe('ou_policy_attachment');
    expect(authModel.permissionStatus).toBe('legacy_compatibility');
    expect(authModel.legacyDataLocation).toBe('internal_or_migration_output_only');
    expect(authModel.policyDependsOnPermission).toBe(false);
  });

  it('returns zero counts and empty model fields when data is missing', () => {
    const { summary, authModel } = parseAuthSummary({});

    expect(summary.users).toBe(0);
    expect(summary.roles).toBe(0);
    expect(summary.policies).toBe(0);
    expect(summary.orgUnits).toBe(0);
    expect(summary.referrals).toBe(0);
    expect(summary.warnings).toBe(0);
    expect(authModel.canonicalObject).toBe('');
    expect(authModel.policyDependsOnPermission).toBe(false);
  });

  it('reads warnings count from the authoritative summary field, not the array length', () => {
    const payload = {
      data: {
        summary: { warnings: 5 },
        warnings: [{}, {}, {}],
      },
    };

    const { summary } = parseAuthSummary(payload);

    expect(summary.warnings).toBe(5);
  });
});
