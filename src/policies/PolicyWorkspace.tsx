import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError } from '../types';
import { PolicyDocumentPreview } from './PolicyDocumentPreview';
import { PolicyForm } from './PolicyForm';
import {
  parsePolicyList,
  parsePolicyDetail,
  derivePolicyReferences,
} from './policyData';
import type { AuthPolicy, PolicyFormValue, PolicyReferenceSummary } from './policyData';

type Page =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; policyId: string }
  | { kind: 'edit'; policyId: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; policies: AuthPolicy[] };

type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; policy: AuthPolicy; references: PolicyReferenceSummary };

function PolicyWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [page, setPage] = useState<Page>({ kind: 'list' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
  const [detail, setDetail] = useState<DetailLoadState>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const loadList = useCallback(async () => {
    if (!client) {
      setList({ kind: 'idle' });
      return;
    }
    setList({ kind: 'loading' });
    try {
      const [policiesPayload, authConfigPayload] = await Promise.all([
        client.listPolicies(),
        client.getAuthConfig(),
      ]);
      const policies = parsePolicyList(policiesPayload);
      setList({ kind: 'ready', policies });
      return { policies, authConfig: authConfigPayload };
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
      return null;
    }
  }, [client]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function loadDetail(policyId: string) {
    if (!client) return;
    setDetail({ kind: 'loading' });
    try {
      const [policyPayload, authConfigPayload] = await Promise.all([
        client.getPolicy(policyId),
        client.getAuthConfig(),
      ]);
      const policy = parsePolicyDetail(policyPayload);
      const references = derivePolicyReferences(authConfigPayload, policy);
      setDetail({ kind: 'ready', policy, references });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  function selectPolicy(policyId: string) {
    setPage({ kind: 'detail', policyId });
    setDetail({ kind: 'loading' });
    void loadDetail(policyId);
  }

  async function handleCreate(value: PolicyFormValue) {
    if (!client) return;
    setSaving(true);
    try {
      const result = await client.createPolicy({
        name: value.name,
        description: value.description,
        policy_document: value.policyDocument,
      });
      await loadList();
      const policy = parsePolicyDetail(result);
      setPage({ kind: 'detail', policyId: policy.policyId });
      void loadDetail(policy.policyId);
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(policyId: string, value: PolicyFormValue) {
    if (!client) return;
    setSaving(true);
    try {
      await client.updatePolicy(policyId, {
        name: value.name,
        description: value.description,
        policy_document: value.policyDocument,
      });
      await loadList();
      void loadDetail(policyId);
      setPage({ kind: 'detail', policyId });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(policyId: string) {
    if (!client) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await client.deletePolicy(policyId);
      setPage({ kind: 'list' });
      setDetail({ kind: 'idle' });
      await loadList();
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (message.toLowerCase().includes('policy_in_use') || message.toLowerCase().includes('in use')) {
        setDeleteError(`Cannot delete: policy is still in use. ${message}`);
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmation(null);
    }
  }

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Policies</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage policies.</p>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Policies</h2>
          </div>
        </div>
        <p className="muted">Loading policies…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Policies</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost" type="button" onClick={() => void loadList()} style={{ marginTop: 12 }}>
          Retry
        </button>
      </section>
    );
  }

  const { policies } = list;

  if (page.kind === 'create') {
    return (
      <PolicyForm mode="create" saving={saving} onSave={handleCreate} onCancel={() => setPage({ kind: 'list' })} />
    );
  }

  if (page.kind === 'edit') {
    const editingPolicy = policies.find((p) => p.policyId === page.policyId);
    return (
      <PolicyForm
        mode="edit"
        policy={editingPolicy}
        saving={saving}
        onSave={(value) => void handleUpdate(page.policyId, value)}
        onCancel={() => setPage({ kind: 'detail', policyId: page.policyId })}
      />
    );
  }

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Policies</h2>
          </div>
          <button className="button primary" type="button" onClick={() => setPage({ kind: 'create' })}>
            <Plus size={16} /> Create
          </button>
        </div>

        {policies.length === 0 ? (
          <p className="muted">No policies defined. Create one to get started.</p>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>External Key</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.policyId}
                  className={page.kind === 'detail' && page.policyId === policy.policyId ? 'row-selected' : ''}
                  onClick={() => selectPolicy(policy.policyId)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="kv-mono">{truncateUUID(policy.policyId)}</td>
                  <td>{policy.name || '—'}</td>
                  <td className="kv-mono">{policy.slug || '—'}</td>
                  <td className="kv-mono">{policy.externalKey || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {page.kind === 'detail' && <PolicyDetailPane state={detail} onEdit={(id) => setPage({ kind: 'edit', policyId: id })} onDelete={handleDeleteConfirm} deleteConfirmation={deleteConfirmation} deleting={deleting} deleteError={deleteError} onDeleteConfirm={setDeleteConfirmation} onDeleteCancel={() => { setDeleteConfirmation(null); setDeleteError(''); }} />}
    </div>
  );

  function handleDeleteConfirm(policyId: string) {
    setDeleteConfirmation(policyId);
    setDeleteError('');
  }
}

function PolicyDetailPane({
  state,
  onEdit,
  onDelete,
  deleteConfirmation,
  deleting,
  deleteError,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  state: DetailLoadState;
  onEdit: (policyId: string) => void;
  onDelete: (policyId: string) => void;
  deleteConfirmation: string | null;
  deleting: boolean;
  deleteError: string;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <section className="panel">
        <p className="muted">Loading policy details…</p>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="panel">
        <p className="error">{state.message}</p>
      </section>
    );
  }

  const { policy, references } = state;
  const hasReferences = references.total > 0;
  const isConfirming = deleteConfirmation === policy.policyId;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Policy Detail</p>
          <h2>{policy.name || 'Unnamed Policy'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={() => onEdit(policy.policyId)}>
            Edit
          </button>
          {isConfirming ? (
            <>
              <button
                className="button danger"
                type="button"
                onClick={() => onDelete(policy.policyId)}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button className="button ghost" type="button" onClick={onDeleteCancel} disabled={deleting}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className="button ghost"
              type="button"
              onClick={() => onDeleteConfirm(policy.policyId)}
              disabled={hasReferences}
              title={hasReferences ? 'Detach references before deleting this policy' : undefined}
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {deleteError && <p className="error" style={{ marginBottom: 12 }}>{deleteError}</p>}

      <dl className="kv-list">
        <dt>Policy ID</dt>
        <dd className="kv-mono">{policy.policyId || '—'}</dd>
        <dt>Slug</dt>
        <dd className="kv-mono">{policy.slug || '—'}</dd>
        <dt>External Key</dt>
        <dd className="kv-mono">{policy.externalKey || '—'}</dd>
        <dt>Description</dt>
        <dd>{policy.description || '—'}</dd>
        <dt>Created</dt>
        <dd>{policy.createdAt ? new Date(policy.createdAt).toLocaleString() : '—'}</dd>
        <dt>Updated</dt>
        <dd>{policy.updatedAt ? new Date(policy.updatedAt).toLocaleString() : '—'}</dd>
      </dl>

      <div className="panel-section">
        <PolicyDocumentPreview document={policy.document} />
      </div>

      <div className="panel-section">
        <div className="panel-heading" style={{ marginBottom: 12 }}>
          <div>
            <p className="eyebrow">References</p>
            <h3>Attached To</h3>
          </div>
        </div>
        {references.total === 0 ? (
          <p className="muted">This policy is not attached to any users, roles, OUs, or referrals.</p>
        ) : (
          <>
            {hasReferences && (
              <p className="warning" style={{ marginBottom: 12 }}>
                Detach all references before deleting this policy.
              </p>
            )}
            <ReferenceList label="Users" items={references.users} />
            <ReferenceList label="Roles" items={references.roles} />
            <ReferenceList label="Org Units" items={references.ous} />
            <ReferenceList label="Referrals" items={references.referrals} />
          </>
        )}
      </div>
    </section>
  );
}

function ReferenceList({ label, items }: { label: string; items: { id: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <strong style={{ fontSize: 13 }}>{label}</strong>
      <ul className="reference-list">
        {items.map((item) => (
          <li key={item.id} className="kv-mono">
            {item.label !== item.id ? `${item.label} (${item.id})` : item.id}
          </li>
        ))}
      </ul>
    </div>
  );
}

function truncateUUID(uuid: string): string {
  if (uuid.length <= 8) return uuid;
  return `${uuid.slice(0, 8)}...`;
}

export { PolicyWorkspace };
