import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import { BindingPolicyForm } from './BindingPolicyForm';
import {
  parseBindingPolicyList,
  parseBindingPolicyDetail,
  summarizeBindingRules,
} from './bindingPolicyData';
import type { AuthBindingPolicy, BindingPolicyFormValue } from './bindingPolicyData';
import './bindingPolicies.css';

type Page =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; policyId: string }
  | { kind: 'edit'; policyId: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; policies: AuthBindingPolicy[] };

export function BindingPolicyWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [page, setPage] = useState<Page>({ kind: 'list' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
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
      const payload = await client.listBindingPolicies();
      const policies = parseBindingPolicyList(payload);
      setList({ kind: 'ready', policies });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleCreate(value: BindingPolicyFormValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    try {
      const result = await client.createBindingPolicy(value);
      await loadList();
      const policy = parseBindingPolicyDetail(result);
      setPage({ kind: 'detail', policyId: policy.policyId });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(policyId: string, value: BindingPolicyFormValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    try {
      await client.updateBindingPolicy(policyId, value);
      await loadList();
      setPage({ kind: 'detail', policyId });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteConfirm(policyId: string) {
    setDeleteConfirmation(policyId);
    setDeleteError('');
  }

  async function handleDelete(policyId: string) {
    if (!client) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await client.deleteBindingPolicy(policyId);
      setPage({ kind: 'list' });
      await loadList();
    } catch (error: unknown) {
      setDeleteError(formatControlPlaneError(error));
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
            <h2>Binding Policies</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage binding policies.</p>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Binding Policies</h2>
          </div>
        </div>
        <p className="muted">Loading binding policies…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Binding Policies</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost spaced-above" type="button" onClick={() => void loadList()}>
          Retry
        </button>
      </section>
    );
  }

  const { policies } = list;

  if (page.kind === 'create') {
    return (
      <BindingPolicyForm mode="create" saving={saving} onSave={handleCreate} onCancel={() => setPage({ kind: 'list' })} />
    );
  }

  if (page.kind === 'edit') {
    const editingPolicy = policies.find((p) => p.policyId === page.policyId);
    return (
      <BindingPolicyForm
        mode="edit"
        policy={editingPolicy}
        saving={saving}
        onSave={(value) => void handleUpdate(page.policyId, value)}
        onCancel={() => setPage({ kind: 'detail', policyId: page.policyId })}
      />
    );
  }

  const selectedPolicy = page.kind === 'detail' ? policies.find((p) => p.policyId === page.policyId) : null;

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Binding Policies</h2>
          </div>
          <button className="button primary" type="button" onClick={() => setPage({ kind: 'create' })}>
            <Plus size={16} /> Create
          </button>
        </div>

        {policies.length === 0 ? (
          <p className="muted">No binding policies defined. Create one to get started.</p>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Priority</th>
                <th>Policy ID</th>
                <th>Slug</th>
                <th>Rules</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.policyId}
                  className={page.kind === 'detail' && page.policyId === policy.policyId ? 'row-selected' : ''}
                  onClick={() => setPage({ kind: 'detail', policyId: policy.policyId })}
                >
                  <td>
                    <span className={policy.enabled ? 'status-badge available' : 'status-badge disabled'}>
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>{policy.priority}</td>
                  <td className="kv-mono">{truncateUUID(policy.policyId, 8)}</td>
                  <td className="kv-mono">{policy.slug || '—'}</td>
                  <td className="kv-mono truncated-cell">{summarizeBindingRules(policy.rules)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {page.kind === 'detail' && selectedPolicy && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Binding Policy Detail</p>
              <h2>{selectedPolicy.slug || selectedPolicy.policyId || 'Unnamed'}</h2>
            </div>
            <div className="actions">
              <button className="button ghost" type="button" onClick={() => setPage({ kind: 'edit', policyId: selectedPolicy.policyId })}>
                Edit
              </button>
              {deleteConfirmation === selectedPolicy.policyId ? (
                <>
                  <button
                    className="button danger"
                    type="button"
                    onClick={() => void handleDelete(selectedPolicy.policyId)}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                  <button className="button ghost" type="button" onClick={() => { setDeleteConfirmation(null); setDeleteError(''); }} disabled={deleting}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => handleDeleteConfirm(selectedPolicy.policyId)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>

          {deleteError && <p className="error spaced-below">{deleteError}</p>}

          <dl className="kv-list">
            <dt>Policy ID</dt>
            <dd className="kv-mono">{selectedPolicy.policyId || '—'}</dd>
            <dt>Slug</dt>
            <dd className="kv-mono">{selectedPolicy.slug || '—'}</dd>
            <dt>External Key</dt>
            <dd className="kv-mono">{selectedPolicy.externalKey || '—'}</dd>
            <dt>Enabled</dt>
            <dd>
              <span className={selectedPolicy.enabled ? 'status-badge available' : 'status-badge disabled'}>
                {selectedPolicy.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </dd>
            <dt>Priority</dt>
            <dd>{selectedPolicy.priority}</dd>
            <dt>Created</dt>
            <dd>{selectedPolicy.createdAt ? new Date(selectedPolicy.createdAt).toLocaleString() : '—'}</dd>
            <dt>Updated</dt>
            <dd>{selectedPolicy.updatedAt ? new Date(selectedPolicy.updatedAt).toLocaleString() : '—'}</dd>
          </dl>

          <div className="panel-section">
            <div className="panel-heading spaced-below">
              <div>
                <p className="eyebrow">Rules</p>
                <h3>Binding Rules</h3>
              </div>
            </div>
            <pre className="rules-preview">{JSON.stringify(selectedPolicy.rules, null, 2)}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
