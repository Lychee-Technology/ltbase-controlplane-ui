import { useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import {
  buildOrgChartTree,
  parseOrgChart,
  type OrgChartNode,
  type OrgChartReadModel,
} from './organizationData';

interface Props {
  client: ControlPlaneClient | null;
  rootOuOptions: { ouId: string; name: string }[];
  onSelectOu: (ouId: string) => void;
  onSelectUser: (userId: string) => void;
}

type ChartLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; model: OrgChartReadModel; tree: OrgChartNode[] };

export function OrganizationChart({ client, rootOuOptions, onSelectOu, onSelectUser }: Props) {
  const [rootOuId, setRootOuId] = useState('');
  const [includeUsers, setIncludeUsers] = useState(false);
  const [includePolicies, setIncludePolicies] = useState(false);
  const [state, setState] = useState<ChartLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!client) {
      setState({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void (async () => {
      try {
        const payload = await client.getOrgChart({
          root_ou_id: rootOuId || undefined,
          include_users: includeUsers,
          include_policies: includePolicies,
        });

        if (cancelled) {
          return;
        }

        const model = parseOrgChart(payload);
        const tree = buildOrgChartTree(model);
        setState({ kind: 'ready', model, tree });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        setState({ kind: 'error', message: formatControlPlaneError(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, rootOuId, includeUsers, includePolicies]);

  if (!client) {
    return (
      <section className="panel">
        <h2>Org Chart</h2>
        <p className="muted">Sign in to a stack to view the organization chart.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Organization</p>
          <h2>Org Chart</h2>
        </div>
      </div>

      <div className="org-chart-controls">
        <label className="form-field">
          <span className="form-label">Root OU</span>
          <select
            className="form-input"
            value={rootOuId}
            onChange={(e) => setRootOuId(e.target.value)}
          >
            <option value="">All (no filter)</option>
            {rootOuOptions.map((opt) => (
              <option key={opt.ouId} value={opt.ouId}>
                {opt.name || opt.ouId}
              </option>
            ))}
          </select>
        </label>

        <label className="org-toggle-label">
          <input
            type="checkbox"
            checked={includeUsers}
            onChange={(e) => setIncludeUsers(e.target.checked)}
          />
          Show users
        </label>

        <label className="org-toggle-label">
          <input
            type="checkbox"
            checked={includePolicies}
            onChange={(e) => setIncludePolicies(e.target.checked)}
          />
          Show policy attachments
        </label>
      </div>

      {state.kind === 'loading' && <p className="muted">Loading chart…</p>}

      {state.kind === 'error' && (
        <p className="error spaced-above">{state.message}</p>
      )}

      {state.kind === 'ready' && (
        <div className="org-chart-canvas">
          {state.tree.length === 0 ? (
            <p className="muted">No organizational units to display.</p>
          ) : (
            state.tree.map((node) => (
              <ChartNode
                key={node.unit.ouId}
                node={node}
                includeUsers={includeUsers}
                includePolicies={includePolicies}
                onSelectOu={onSelectOu}
                onSelectUser={onSelectUser}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function ChartNode({
  node,
  includeUsers,
  includePolicies,
  onSelectOu,
  onSelectUser,
}: {
  node: OrgChartNode;
  includeUsers: boolean;
  includePolicies: boolean;
  onSelectOu: (ouId: string) => void;
  onSelectUser: (userId: string) => void;
}) {
  const hasChildren = node.children.length > 0;

  return (
    <div className="org-chart-node">
      <div className="org-chart-node-card" onClick={() => onSelectOu(node.unit.ouId)}>
        <div className="org-chart-node-header">
          <span className="org-chart-node-name">{node.unit.name || node.unit.ouId}</span>
        </div>
        <div className="org-chart-node-meta">
          <span className="org-chart-node-id">{truncateUUID(node.unit.ouId)}</span>
          <span className="org-chart-counts">
            {hasChildren && <span className="org-chart-badge">{node.children.length} child OU{node.children.length !== 1 ? 's' : ''}</span>}
            <span className="org-chart-badge">{node.users.length} user{node.users.length !== 1 ? 's' : ''}</span>
            <span className="org-chart-badge">{node.policyAttachments.length} polic{node.policyAttachments.length !== 1 ? 'ies' : 'y'}</span>
          </span>
        </div>

        {includeUsers && node.users.length > 0 && (
          <div className="org-chart-users">
            <span className="org-chart-section-label">Users:</span>
            {node.users.map((user) => (
              <button
                key={user.userId}
                className="org-chart-user-chip"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUser(user.userId);
                }}
              >
                {truncateUUID(user.userId, 10)}
              </button>
            ))}
          </div>
        )}

        {includePolicies && node.policyAttachments.length > 0 && (
          <div className="org-chart-policies">
            <span className="org-chart-section-label">Policies:</span>
            {node.policyAttachments.map((attachment) => (
              <span key={`${attachment.ouId}-${attachment.policyId}`} className="org-chart-policy-chip">
                {truncateUUID(attachment.policyId, 12)}
                {attachment.enforced && <span className="org-chart-enforced">(enforced)</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {hasChildren && (
        <div className="org-chart-children">
          {node.children.map((child) => (
            <ChartNode
              key={child.unit.ouId}
              node={child}
              includeUsers={includeUsers}
              includePolicies={includePolicies}
              onSelectOu={onSelectOu}
              onSelectUser={onSelectUser}
            />
          ))}
        </div>
      )}
    </div>
  );
}
