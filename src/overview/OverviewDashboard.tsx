import { useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError } from '../types';
import type { WorkspaceKey } from '../types';
import {
  parseAuthSummary,
  parseProjectStatus,
  parseSchemaStatus,
  type AuthSummary,
  type AuthorizationModel,
  type ProjectStatus,
  type SchemaStatus,
} from './overviewData';

interface Props {
  client: ControlPlaneClient | null;
  onNavigate: (key: WorkspaceKey) => void;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      project: ProjectStatus;
      schema: SchemaStatus;
      summary: AuthSummary;
      authModel: AuthorizationModel;
    };

export function OverviewDashboard({ client, onNavigate }: Props) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!client) {
      setState({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void (async () => {
      try {
        const [rawStatus, rawSchema, rawAuth] = await Promise.all([
          client.getStatus(),
          client.getSchemaStatus(),
          client.getAuthConfig(),
        ]);

        if (cancelled) return;

        const project = parseProjectStatus(rawStatus);
        const schema = parseSchemaStatus(rawSchema);
        const { summary, authModel } = parseAuthSummary(rawAuth);

        setState({ kind: 'ready', project, schema, summary, authModel });
      } catch (error: unknown) {
        if (cancelled) return;
        setState({ kind: 'error', message: formatControlPlaneError(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  if (!client) {
    return (
      <section className="panel dashboard-empty">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Dashboard</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to load the project overview.</p>
      </section>
    );
  }

  if (state.kind === 'loading') {
    return (
      <section className="panel dashboard-empty">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Dashboard</h2>
          </div>
        </div>
        <p className="muted">Loading dashboard data…</p>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="panel dashboard-error">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Dashboard</h2>
          </div>
        </div>
        <p className="error">{state.message}</p>
      </section>
    );
  }

  if (state.kind === 'idle') {
    return null;
  }

  const { project, schema: schemaStatus, summary, authModel } = state;

  const hasApplied = schemaStatus.appliedVersion !== '';
  const hasPublished = schemaStatus.publishedVersion !== '';

  return (
    <div className="dashboard">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Project</p>
            <h2>{project.projectName || 'Unnamed Project'}</h2>
          </div>
          <span className={project.hasRuntimeInfo ? 'pill ready' : 'pill'}>{project.hasRuntimeInfo ? 'Runtime available' : 'No runtime'}</span>
        </div>
        <dl className="kv-list">
          <dt>Project ID</dt>
          <dd className="kv-mono">{project.projectId || '—'}</dd>
          <dt>Account ID</dt>
          <dd>{project.accountId || '—'}</dd>
          <dt>API Base URL</dt>
          <dd>{project.apiBaseUrl || '—'}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Schema</p>
            <h2>Version Status</h2>
          </div>
        </div>
        <div className="schema-compare">
          <div className="schema-column">
            <h3 className="schema-label">Applied</h3>
            {hasApplied ? (
              <>
                <p className="schema-version">{schemaStatus.appliedVersion}</p>
                <p className="kv-mono">{schemaStatus.appliedSHA ? `${schemaStatus.appliedSHA.slice(0, 12)}…` : '—'}</p>
                <p className="muted">{schemaStatus.appliedAt ? new Date(schemaStatus.appliedAt).toLocaleString() : '—'}</p>
              </>
            ) : (
              <p className="muted">Not applied</p>
            )}
          </div>
          <div className="schema-column">
            <h3 className="schema-label">Published</h3>
            {hasPublished ? (
              <>
                <p className="schema-version">{schemaStatus.publishedVersion}</p>
                <p className="kv-mono">{schemaStatus.publishedSHA ? `${schemaStatus.publishedSHA.slice(0, 12)}…` : '—'}</p>
              </>
            ) : (
              <p className="muted">No published schema</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Configuration Summary</h2>
          </div>
        </div>
        <div className="dashboard-metrics">
          <button className="metric-card" type="button" onClick={() => onNavigate('users')}>
            <span className="metric-count">{summary.users}</span>
            <span className="metric-label">Users</span>
          </button>
          <button className="metric-card" type="button" onClick={() => onNavigate('roles')}>
            <span className="metric-count">{summary.roles}</span>
            <span className="metric-label">Roles</span>
          </button>
          <button className="metric-card" type="button" onClick={() => onNavigate('policies')}>
            <span className="metric-count">{summary.policies}</span>
            <span className="metric-label">Policies</span>
          </button>
          <button className="metric-card" type="button" onClick={() => onNavigate('organization')}>
            <span className="metric-count">{summary.orgUnits}</span>
            <span className="metric-label">Org Units</span>
          </button>
          <button className="metric-card" type="button" onClick={() => onNavigate('referrals')}>
            <span className="metric-count">{summary.referrals}</span>
            <span className="metric-label">Referrals</span>
          </button>
          <button className="metric-card metric-warn" type="button" onClick={() => onNavigate('health')}>
            <span className="metric-count">{summary.warnings}</span>
            <span className="metric-label">Warnings</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Model</p>
            <h2>Authorization Model</h2>
          </div>
        </div>
        <dl className="kv-list">
          <dt>Canonical Object</dt>
          <dd>{authModel.canonicalObject || '—'}</dd>
          <dt>Principal Relationship</dt>
          <dd>{authModel.canonicalPrincipalRelationship || '—'}</dd>
          <dt>Org Relationship</dt>
          <dd>{authModel.canonicalOrgRelationship || '—'}</dd>
          <dt>Permission Status</dt>
          <dd>{authModel.permissionStatus || '—'}</dd>
          <dt>Legacy Data Location</dt>
          <dd>{authModel.legacyDataLocation || '—'}</dd>
          <dt>Policy Depends on Permission</dt>
          <dd>{authModel.policyDependsOnPermission ? 'Yes' : 'No'}</dd>
        </dl>
      </section>
    </div>
  );
}
