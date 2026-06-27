import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import {
  formatRepairTimestamp,
  getRepairStatusClass,
  isPostgresObject,
  parseRepairReport,
  type RepairReport,
} from './repairData';
import './repair.css';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: RepairReport };

export function RepairWorkspace({ client, defaultProjectId }: { client: ControlPlaneClient | null; defaultProjectId: string }) {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [forceRebuildViews, setForceRebuildViews] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [dryRunState, setDryRunState] = useState<LoadState>({ kind: 'idle' });
  const [applyState, setApplyState] = useState<LoadState>({ kind: 'idle' });

  const handleDryRun = useCallback(async () => {
    if (!client) {
      return;
    }
    setDryRunState({ kind: 'loading' });
    try {
      const payload = await client.dryRunRepair({
        project_id: projectId || undefined,
        force_rebuild_views: forceRebuildViews,
      });
      setDryRunState({ kind: 'ready', report: parseRepairReport(payload) });
    } catch (error: unknown) {
      setDryRunState({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client, projectId, forceRebuildViews]);

  const handleApply = useCallback(async () => {
    if (!client) {
      return;
    }
    setApplyState({ kind: 'loading' });
    try {
      const payload = await client.applyRepair({
        project_id: projectId || undefined,
        force_rebuild_views: forceRebuildViews,
      });
      setApplyState({ kind: 'ready', report: parseRepairReport(payload) });
      setConfirmChecked(false);
    } catch (error: unknown) {
      setApplyState({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client, projectId, forceRebuildViews]);

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Repair Operations</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to run repair operations.</p>
      </section>
    );
  }

  return (
    <div className="repair-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Repair Operations</h2>
          </div>
        </div>
        <p className="muted spaced-below">
          Diagnose and repair project records, runtime info, PostgreSQL views, audit columns, and access grants.
        </p>

        <div className="repair-controls">
          <div className="form-fields">
            <label className="form-field">
              <span className="form-label">Project ID</span>
              <input
                className="form-input"
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Leave empty to use deployment project"
              />
            </label>
            <label className="form-field">
              <span className="form-label">Advanced</span>
              <label className="repair-checkbox-label">
                <input
                  type="checkbox"
                  checked={forceRebuildViews}
                  onChange={(e) => setForceRebuildViews(e.target.checked)}
                />
                <span>Force rebuild views (drop and recreate PostgreSQL/DSQL views)</span>
              </label>
            </label>
          </div>

          <div className="repair-actions">
            <div className="repair-action-group">
              <p className="eyebrow">Dry-run</p>
              <p className="muted spaced-below">Preview what will be fixed without making changes.</p>
              <button
                className="button primary"
                type="button"
                onClick={() => void handleDryRun()}
                disabled={dryRunState.kind === 'loading'}
              >
                {dryRunState.kind === 'loading' ? 'Running dry-run…' : 'Run Dry-run'}
              </button>
              <RepairReportView state={dryRunState} title="Dry-run Report" />
            </div>

            <div className="repair-action-group">
              <p className="eyebrow">Apply</p>
              <div className="warning spaced-below">
                <AlertTriangle size={16} />
                <span>Repair apply writes changes. Verify the dry-run report first.</span>
              </div>
              <label className="repair-checkbox-label spaced-below">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                />
                <span>I confirm that I want to execute the repair</span>
              </label>
              <button
                className="button primary"
                type="button"
                onClick={() => void handleApply()}
                disabled={!confirmChecked || applyState.kind === 'loading'}
              >
                {applyState.kind === 'loading' ? 'Applying repair…' : 'Apply Repair'}
              </button>
              <RepairReportView state={applyState} title="Apply Report" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RepairReportView({ state, title }: { state: LoadState; title: string }) {
  if (state.kind === 'idle') {
    return null;
  }

  if (state.kind === 'loading') {
    return <p className="muted spaced-above">Running repair…</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="panel panel-section">
        <p className="eyebrow">{title}</p>
        <p className="error">{state.message}</p>
      </div>
    );
  }

  const { report } = state;
  const { summary } = report;
  const actionsTaken = report.results.filter((r) => r.status === 'fixed');
  const sqlObjects = report.results.filter((r) => isPostgresObject(r.object));
  const warnings = report.results.filter(
    (r) => r.status === 'missing' || r.status === 'error' || r.status === 'skipped',
  );
  const hasIssues = summary.missing > 0 || summary.error > 0;

  return (
    <div className="panel panel-section">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>
            {hasIssues ? (
              <span className="error">Issues Detected</span>
            ) : (
              <span className="pill ready">All OK</span>
            )}
          </h3>
        </div>
        <span className="muted">{formatRepairTimestamp(report.checkedAt)}</span>
      </div>

      <dl className="kv-list">
        <dt>Project ID</dt>
        <dd className="kv-mono">{truncateUUID(report.projectId, 36)}</dd>
        <dt>Mode</dt>
        <dd>{report.dryRun ? 'Dry-run' : 'Apply'}</dd>
      </dl>

      <div className="panel-section">
        <p className="eyebrow">Summary</p>
        <div className="repair-summary-grid">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="OK" value={summary.ok} kind="ok" />
          <SummaryCard label="Fixed" value={summary.fixed} kind="fixed" />
          <SummaryCard label="Missing" value={summary.missing} kind="missing" />
          <SummaryCard label="Skipped" value={summary.skipped} kind="skipped" />
          <SummaryCard label="Errors" value={summary.error} kind="error" />
        </div>
      </div>

      {actionsTaken.length > 0 && (
        <div className="panel-section">
          <p className="eyebrow">Actions Taken</p>
          <ul className="repair-result-list">
            {actionsTaken.map((r) => (
              <li key={`${r.status}-${r.object}`} className="repair-result-item">
                <span className={`repair-status-badge ${getRepairStatusClass(r.status)}`}>{r.status}</span>
                <span className="repair-result-object">{r.object}</span>
                <span className="repair-result-detail">{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sqlObjects.length > 0 && (
        <div className="panel-section">
          <p className="eyebrow">SQL Objects Checked</p>
          <ul className="repair-result-list">
            {sqlObjects.map((r) => (
              <li key={`${r.status}-${r.object}`} className="repair-result-item">
                <span className={`repair-status-badge ${getRepairStatusClass(r.status)}`}>{r.status}</span>
                <span className="repair-result-object">{r.object}</span>
                <span className="repair-result-detail">{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="panel-section">
          <p className="eyebrow">Warnings</p>
          <ul className="repair-result-list">
            {warnings.map((r) => (
              <li key={`${r.status}-${r.object}`} className="repair-result-item">
                <span className={`repair-status-badge ${getRepairStatusClass(r.status)}`}>{r.status}</span>
                <span className="repair-result-object">{r.object}</span>
                <span className="repair-result-detail">{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.results.length > 0 && (
        <div className="panel-section">
          <p className="eyebrow">All Results</p>
          <table className="policy-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Object</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={`${r.status}-${r.object}`}>
                  <td>
                    <span className={`repair-status-badge ${getRepairStatusClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="kv-mono">{r.object}</td>
                  <td>{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, kind }: { label: string; value: number; kind?: string }) {
  const icon = kind === 'ok' ? <CheckCircle size={14} /> : kind === 'missing' || kind === 'error' ? <XCircle size={14} /> : undefined;
  const className = kind ? `repair-summary-card repair-summary-${kind}` : 'repair-summary-card';

  return (
    <div className={className}>
      <span className="repair-summary-value">
        {icon && <span className="repair-summary-icon">{icon}</span>}
        {value}
      </span>
      <span className="repair-summary-label">{label}</span>
    </div>
  );
}
