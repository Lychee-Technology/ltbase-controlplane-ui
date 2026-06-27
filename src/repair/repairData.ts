export interface RepairResult {
  object: string;
  status: string;
  detail: string;
}

export interface RepairSummary {
  total: number;
  ok: number;
  fixed: number;
  missing: number;
  skipped: number;
  error: number;
}

export interface RepairReport {
  projectId: string;
  dryRun: boolean;
  checkedAt: number;
  results: RepairResult[];
  summary: RepairSummary;
}

export function parseRepairReport(payload: unknown): RepairReport {
  // pluckData guards against non-object/missing payloads, always returning an object,
  // so the cast below is safe and no separate top-level typeof check is needed.
  const data = pluckData(payload) as Record<string, unknown>;
  const rawResults = Array.isArray(data.results) ? data.results : [];
  const rawSummary = (data.summary ?? {}) as Record<string, unknown>;

  return {
    projectId: String(data.project_id ?? ''),
    dryRun: Boolean(data.dry_run),
    checkedAt: Number(data.checked_at ?? 0),
    results: rawResults.map((item: unknown) => {
      const r = (item ?? {}) as Record<string, unknown>;
      return {
        object: String(r.object ?? ''),
        status: String(r.status ?? ''),
        detail: String(r.detail ?? ''),
      };
    }),
    summary: {
      total: Number(rawSummary.total ?? 0),
      ok: Number(rawSummary.ok ?? 0),
      fixed: Number(rawSummary.fixed ?? 0),
      missing: Number(rawSummary.missing ?? 0),
      skipped: Number(rawSummary.skipped ?? 0),
      error: Number(rawSummary.error ?? 0),
    },
  };
}

export function formatRepairTimestamp(ms: number): string {
  if (ms <= 0) {
    return '—';
  }
  return new Date(ms).toLocaleString();
}

const STATUS_CLASS: Record<string, string> = {
  ok: 'repair-status-ok',
  fixed: 'repair-status-fixed',
  missing: 'repair-status-missing',
  skipped: 'repair-status-skipped',
  error: 'repair-status-error',
};

export function getRepairStatusClass(status: string): string {
  return STATUS_CLASS[status] ?? '';
}

export function isPostgresObject(object: string): boolean {
  return object.startsWith('postgres.');
}

function pluckData(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      return data;
    }
  }
  return {};
}
