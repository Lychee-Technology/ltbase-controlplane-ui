import { describe, expect, it } from 'vitest';
import {
  formatRepairTimestamp,
  getRepairStatusClass,
  isPostgresObject,
  parseRepairReport,
} from './repairData';
import type { RepairReport } from './repairData';

const samplePayload = {
  data: {
    project_id: '11111111-1111-4111-8111-111111111111',
    dry_run: false,
    checked_at: 1700000000000,
    results: [
      { object: 'dynamodb.project_record', status: 'ok', detail: 'Project record exists' },
      { object: 'dynamodb.runtime_info', status: 'fixed', detail: 'Created runtime info record' },
      { object: 'postgres.project_sql_objects', status: 'ok', detail: 'All views present' },
      { object: 'postgres.project_sql_read_access', status: 'missing', detail: 'Read access grant missing' },
      { object: 'postgres.project_audit_columns', status: 'skipped', detail: 'Audit columns already present' },
      { object: 'dynamodb.agent_workflow', status: 'error', detail: 'Failed to insert agent workflow' },
    ],
    summary: {
      total: 6,
      ok: 2,
      fixed: 1,
      missing: 1,
      skipped: 1,
      error: 1,
    },
  },
};

describe('parseRepairReport', () => {
  it('parses a full repair report payload', () => {
    const report = parseRepairReport(samplePayload);

    expect(report.projectId).toBe('11111111-1111-4111-8111-111111111111');
    expect(report.dryRun).toBe(false);
    expect(report.checkedAt).toBe(1700000000000);
    expect(report.results).toHaveLength(6);
    expect(report.results[0].object).toBe('dynamodb.project_record');
    expect(report.results[0].status).toBe('ok');
    expect(report.results[0].detail).toBe('Project record exists');
    expect(report.summary.total).toBe(6);
    expect(report.summary.ok).toBe(2);
    expect(report.summary.fixed).toBe(1);
    expect(report.summary.missing).toBe(1);
    expect(report.summary.skipped).toBe(1);
    expect(report.summary.error).toBe(1);
  });

  it('parses a dry-run report', () => {
    const payload = { data: { project_id: 'p1', dry_run: true, checked_at: 0, results: [], summary: { total: 0, ok: 0, fixed: 0, missing: 0, skipped: 0, error: 0 } } };
    const report = parseRepairReport(payload);

    expect(report.dryRun).toBe(true);
    expect(report.results).toHaveLength(0);
    expect(report.summary.total).toBe(0);
  });

  it('returns defaults for missing data', () => {
    const report = parseRepairReport({});

    expect(report.projectId).toBe('');
    expect(report.dryRun).toBe(false);
    expect(report.checkedAt).toBe(0);
    expect(report.results).toHaveLength(0);
    expect(report.summary.total).toBe(0);
  });

  it('handles null results and summary gracefully', () => {
    const payload = { data: { project_id: 'p1', results: null, summary: null } };
    const report = parseRepairReport(payload);

    expect(report.results).toHaveLength(0);
    expect(report.summary.total).toBe(0);
  });

  it('parses result item with missing fields as empty strings', () => {
    const payload = { data: { results: [{ object: 'obj', detail: 'desc' }] } };
    const report = parseRepairReport(payload);

    expect(report.results[0].status).toBe('');
  });
});

describe('formatRepairTimestamp', () => {
  it('formats a positive timestamp', () => {
    const result = formatRepairTimestamp(1700000000000);
    expect(result).toContain('2023');
  });

  it('returns dash for zero', () => {
    expect(formatRepairTimestamp(0)).toBe('—');
  });

  it('returns dash for negative', () => {
    expect(formatRepairTimestamp(-1)).toBe('—');
  });
});

describe('getRepairStatusClass', () => {
  it('returns the correct class for each known status', () => {
    expect(getRepairStatusClass('ok')).toBe('repair-status-ok');
    expect(getRepairStatusClass('fixed')).toBe('repair-status-fixed');
    expect(getRepairStatusClass('missing')).toBe('repair-status-missing');
    expect(getRepairStatusClass('skipped')).toBe('repair-status-skipped');
    expect(getRepairStatusClass('error')).toBe('repair-status-error');
  });

  it('returns empty string for unknown status', () => {
    expect(getRepairStatusClass('unknown')).toBe('');
  });
});

describe('isPostgresObject', () => {
  it('returns true for postgres-prefixed objects', () => {
    expect(isPostgresObject('postgres.project_sql_objects')).toBe(true);
    expect(isPostgresObject('postgres.project_audit_columns')).toBe(true);
  });

  it('returns false for non-postgres objects', () => {
    expect(isPostgresObject('dynamodb.project_record')).toBe(false);
    expect(isPostgresObject('')).toBe(false);
  });
});

describe('RepairReport helpers', () => {
  it('filtering fixed results yields actions taken', () => {
    const report = parseRepairReport(samplePayload);
    const actions = report.results.filter((r) => r.status === 'fixed');
    expect(actions).toHaveLength(1);
    expect(actions[0].object).toBe('dynamodb.runtime_info');
    expect(actions[0].detail).toBe('Created runtime info record');
  });

  it('filtering postgres objects yields SQL objects checked', () => {
    const report = parseRepairReport(samplePayload);
    const sqlObjects = report.results.filter((r) => isPostgresObject(r.object));
    expect(sqlObjects).toHaveLength(3);
    expect(sqlObjects[0].object).toBe('postgres.project_sql_objects');
  });

  it('warnings combine missing, error, and skipped results', () => {
    const report = parseRepairReport(samplePayload);
    const warnings = report.results.filter(
      (r) => r.status === 'missing' || r.status === 'error' || r.status === 'skipped',
    );
    expect(warnings).toHaveLength(3);
  });
});
