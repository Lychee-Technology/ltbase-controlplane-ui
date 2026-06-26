import { Ban, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import { parsePolicyList } from '../policies/policyData';
import type { AuthPolicy } from '../policies/policyData';
import {
  datetimeLocalToMillis,
  millisToDatetimeLocal,
  parseReferralList,
  validateBatchImportJSON,
} from './referralData';
import type { AuthReferral, ReferralStatus } from './referralData';
import './referrals.css';

function isReferralInUseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'referral_in_use'
  );
}

type Page =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'import' }
  | { kind: 'detail'; code: string }
  | { kind: 'edit-expiration'; code: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: AuthReferral[]; total: number };

type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; referral: AuthReferral };

type PolicyLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; policies: AuthPolicy[] };

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'available', label: 'Available' },
  { value: 'used', label: 'Used' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Disabled' },
];

function statusBadgeClass(status: ReferralStatus): string {
  return `status-badge ${status}`;
}

function formatTimestamp(ms: number): string {
  if (!ms || ms <= 0) {
    return '—';
  }
  return new Date(ms).toLocaleString();
}

export function ReferralWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [page, setPage] = useState<Page>({ kind: 'list' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
  const [detail, setDetail] = useState<DetailLoadState>({ kind: 'idle' });
  const [policies, setPolicies] = useState<PolicyLoadState>({ kind: 'idle' });
  const [statusFilter, setStatusFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [disableConfirmation, setDisableConfirmation] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const loadList = useCallback(async () => {
    if (!client) {
      setList({ kind: 'idle' });
      return;
    }
    setList({ kind: 'loading' });
    try {
      const params: { status?: string; code?: string } = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (codeFilter) {
        params.code = codeFilter;
      }
      const payload = await client.listReferrals(params);
      const result = parseReferralList(payload);
      setList({ kind: 'ready', items: result.items, total: result.total });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client, statusFilter, codeFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadPolicies = useCallback(async () => {
    if (!client) {
      setPolicies({ kind: 'idle' });
      return;
    }
    setPolicies({ kind: 'loading' });
    try {
      const payload = await client.listPolicies();
      setPolicies({ kind: 'ready', policies: parsePolicyList(payload) });
    } catch (error: unknown) {
      setPolicies({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  async function loadDetail(code: string) {
    if (!client) {
      return;
    }
    setDetail({ kind: 'loading' });
    try {
      const listPayload = await client.listReferrals({ code });
      const result = parseReferralList(listPayload);
      const found = result.items.find((r) => r.code === code);
      if (found) {
        setDetail({ kind: 'ready', referral: found });
      } else {
        setDetail({ kind: 'error', message: `Referral "${code}" not found.` });
      }
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  function selectReferral(code: string) {
    setPage({ kind: 'detail', code });
    setDetail({ kind: 'loading' });
    setDeleteError('');
    setDeleteConfirmation(null);
    setDisableConfirmation(null);
    void loadDetail(code);
  }

  async function handleCreate(form: { code: string; policyId: string; expiresAtLocal: string }) {
    if (!client) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const data: { code: string; policy_id?: string; expires_at_ms: number } = {
        code: form.code,
        expires_at_ms: datetimeLocalToMillis(form.expiresAtLocal),
      };
      if (form.policyId) {
        data.policy_id = form.policyId;
      }
      await client.createReferral(data);
      await loadList();
      selectReferral(form.code);
    } catch (error: unknown) {
      setSaveError(formatControlPlaneError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!client) {
      return;
    }
    setImportError('');
    const result = validateBatchImportJSON(importText);
    if (!result.valid) {
      setImportError(result.message);
      return;
    }
    setImporting(true);
    try {
      const importPayload = result.items.map((item) => ({
        referral_code: item.referralCode,
        policy_id: item.policyId || undefined,
        expires_at_ms: item.expiresAtMillis || undefined,
      }));
      await client.importReferrals(importPayload);
      setImportText('');
      setPage({ kind: 'list' });
      await loadList();
    } catch (error: unknown) {
      setImportError(formatControlPlaneError(error));
    } finally {
      setImporting(false);
    }
  }

  async function handleUpdateExpiration(code: string, expiresAtLocal: string) {
    if (!client) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await client.updateReferralExpiration(code, {
        expires_at_ms: datetimeLocalToMillis(expiresAtLocal),
      });
      setPage({ kind: 'detail', code });
      void loadDetail(code);
    } catch (error: unknown) {
      setSaveError(formatControlPlaneError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(code: string) {
    if (!client) {
      return;
    }
    setDisabling(true);
    try {
      await client.disableReferral(code);
      setDisableConfirmation(null);
      void loadDetail(code);
      await loadList();
    } catch (error: unknown) {
      setSaveError(formatControlPlaneError(error));
    } finally {
      setDisabling(false);
    }
  }

  async function handleDelete(code: string) {
    if (!client) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await client.deleteReferral(code);
      setPage({ kind: 'list' });
      setDetail({ kind: 'idle' });
      await loadList();
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isReferralInUseError(error)) {
        setDeleteError(
          `Cannot delete: this referral code has already been used. It can be disabled instead. (${message})`,
        );
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
            <p className="eyebrow">Identity & Access</p>
            <h2>Referrals</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage referrals.</p>
      </section>
    );
  }

  if (page.kind === 'create') {
    return <CreateReferralForm policies={policies} saving={saving} saveError={saveError} onSave={handleCreate} onCancel={() => { setPage({ kind: 'list' }); setSaveError(''); }} />;
  }

  if (page.kind === 'import') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Import Referrals</h2>
          </div>
          <button className="button ghost" type="button" onClick={() => { setPage({ kind: 'list' }); setImportError(''); setImportText(''); }}>
            Cancel
          </button>
        </div>
        <p className="muted spaced-below">
          Paste a JSON array of referral objects. Each object must have a <code>referral_code</code> field.
        </p>
        <textarea
          className="import-textarea"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={'[{"referral_code":"CODE1","policy_id":"policy.read"}]'}
          disabled={importing}
        />
        {importError && <p className="error spaced-above">{importError}</p>}
        <button
          className="button primary spaced-above"
          type="button"
          onClick={() => void handleImport()}
          disabled={importing}
        >
          {importing ? 'Importing…' : 'Import'}
        </button>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Referrals</h2>
          </div>
        </div>
        <p className="muted">Loading referrals…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Referrals</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost spaced-above" type="button" onClick={() => void loadList()}>
          Retry
        </button>
      </section>
    );
  }

  const { items, total } = list;

  if (page.kind === 'edit-expiration') {
    const editingRef = items.find((r) => r.code === page.code);
    return (
      <EditExpirationForm
        referral={editingRef}
        saving={saving}
        saveError={saveError}
        onSave={(expiresAtLocal) => void handleUpdateExpiration(page.code, expiresAtLocal)}
        onCancel={() => setPage({ kind: 'detail', code: page.code })}
      />
    );
  }

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Referrals</h2>
          </div>
          <div className="actions">
            <button className="button primary" type="button" onClick={() => { setPage({ kind: 'create' }); setSaveError(''); }}>
              <Plus size={16} /> Create
            </button>
            <button className="button ghost" type="button" onClick={() => { setPage({ kind: 'import' }); setImportError(''); setImportText(''); }}>
              <Download size={16} /> Import
            </button>
          </div>
        </div>

        <div className="filter-section spaced-below">
          <div className="filter-grid">
            <label className="form-field">
              <span className="form-label">Status</span>
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Exact code</span>
              <input
                className="form-input"
                type="text"
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                placeholder="REF-001"
              />
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="muted">{total === 0 ? 'No referrals found. Create or import referral codes to get started.' : 'No referrals match the current filters.'}</p>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Policy</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {items.map((referral) => (
                <tr
                  key={referral.code}
                  className={page.kind === 'detail' && page.code === referral.code ? 'row-selected' : ''}
                  onClick={() => selectReferral(referral.code)}
                >
                  <td className="kv-mono">{referral.code || '—'}</td>
                  <td><span className={statusBadgeClass(referral.status)}>{referral.status}</span></td>
                  <td className="kv-mono">{referral.policyId ? truncateUUID(referral.policyId, 8) : '—'}</td>
                  <td>{formatTimestamp(referral.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {page.kind === 'detail' && (
        <ReferralDetailPane
          state={detail}
          deleteConfirmation={deleteConfirmation}
          deleting={deleting}
          deleteError={deleteError}
          disableConfirmation={disableConfirmation}
          disabling={disabling}
          saveError={saveError}
          onEditExpiration={(code) => { setPage({ kind: 'edit-expiration', code }); setSaveError(''); }}
          onDisableConfirm={(code) => setDisableConfirmation(code)}
          onDisableCancel={() => setDisableConfirmation(null)}
          onDisable={(code) => void handleDisable(code)}
          onDeleteConfirm={(code) => setDeleteConfirmation(code)}
          onDeleteCancel={() => { setDeleteConfirmation(null); setDeleteError(''); }}
          onDelete={(code) => void handleDelete(code)}
        />
      )}
    </div>
  );
}

function ReferralDetailPane({
  state,
  deleteConfirmation,
  deleting,
  deleteError,
  disableConfirmation,
  disabling,
  saveError,
  onEditExpiration,
  onDisableConfirm,
  onDisableCancel,
  onDisable,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
}: {
  state: DetailLoadState;
  deleteConfirmation: string | null;
  deleting: boolean;
  deleteError: string;
  disableConfirmation: string | null;
  disabling: boolean;
  saveError: string;
  onEditExpiration: (code: string) => void;
  onDisableConfirm: (code: string) => void;
  onDisableCancel: () => void;
  onDisable: (code: string) => void;
  onDeleteConfirm: (code: string) => void;
  onDeleteCancel: () => void;
  onDelete: (code: string) => void;
}) {
  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <section className="panel">
        <p className="muted">Loading referral details…</p>
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

  const { referral } = state;
  const isConfirmingDelete = deleteConfirmation === referral.code;
  const isConfirmingDisable = disableConfirmation === referral.code;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Referral Detail</p>
          <h2>{referral.code || 'Unnamed Referral'}</h2>
        </div>
        <div className="actions">
          {referral.status !== 'disabled' && (
            <>
              <button className="button ghost" type="button" onClick={() => onEditExpiration(referral.code)}>
                <Pencil size={16} /> Edit Expiration
              </button>
              {isConfirmingDisable ? (
                <>
                  <button
                    className="button danger"
                    type="button"
                    onClick={() => onDisable(referral.code)}
                    disabled={disabling}
                  >
                    {disabling ? 'Disabling…' : 'Confirm Disable'}
                  </button>
                  <button className="button ghost" type="button" onClick={onDisableCancel} disabled={disabling}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => onDisableConfirm(referral.code)}
                >
                  <Ban size={16} /> Disable
                </button>
              )}
            </>
          )}
          {isConfirmingDelete ? (
            <>
              <button
                className="button danger"
                type="button"
                onClick={() => onDelete(referral.code)}
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
              onClick={() => onDeleteConfirm(referral.code)}
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {saveError && <p className="error spaced-below">{saveError}</p>}
      {deleteError && <p className="error spaced-below">{deleteError}</p>}

      <dl className="kv-list">
        <dt>Code</dt>
        <dd className="kv-mono">{referral.code || '—'}</dd>
        <dt>Status</dt>
        <dd><span className={statusBadgeClass(referral.status)}>{referral.status}</span></dd>
        <dt>Policy ID</dt>
        <dd className="kv-mono">{referral.policyId ? truncateUUID(referral.policyId) : '—'}</dd>
        <dt>Used At</dt>
        <dd>{formatTimestamp(referral.usedAt)}</dd>
        <dt>Expires At</dt>
        <dd>{formatTimestamp(referral.expiresAt)}</dd>
        <dt>Created</dt>
        <dd>{formatTimestamp(referral.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatTimestamp(referral.updatedAt)}</dd>
      </dl>
    </section>
  );
}

function CreateReferralForm({
  policies,
  saving,
  saveError,
  onSave,
  onCancel,
}: {
  policies: PolicyLoadState;
  saving: boolean;
  saveError: string;
  onSave: (form: { code: string; policyId: string; expiresAtLocal: string }) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');

  function handleSubmit() {
    onSave({ code: code.trim(), policyId, expiresAtLocal });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Identity & Access</p>
          <h2>Create Referral</h2>
        </div>
        <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {saveError && <p className="error spaced-below">{saveError}</p>}
      <div className="form-fields">
        <label className="form-field">
          <span className="form-label">Code *</span>
          <input
            className="form-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="REF-001"
            disabled={saving}
          />
        </label>
        <label className="form-field">
          <span className="form-label">Policy (optional)</span>
          {policies.kind === 'loading' ? (
            <p className="muted">Loading policies…</p>
          ) : policies.kind === 'error' ? (
            <p className="error">{policies.message}</p>
          ) : (
            <select
              className="form-input"
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              disabled={saving}
            >
              <option value="">None</option>
              {policies.kind === 'ready' && policies.policies.map((p) => (
                <option key={p.policyId} value={p.policyId}>
                  {p.name || p.slug || p.policyId}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="form-field">
          <span className="form-label">Expiration</span>
          <input
            className="form-input"
            type="datetime-local"
            value={expiresAtLocal}
            onChange={(e) => setExpiresAtLocal(e.target.value)}
            disabled={saving}
          />
        </label>
      </div>
      <button
        className="button primary spaced-above"
        type="button"
        onClick={handleSubmit}
        disabled={saving || !code.trim()}
      >
        {saving ? 'Creating…' : 'Create Referral'}
      </button>
    </section>
  );
}

function EditExpirationForm({
  referral,
  saving,
  saveError,
  onSave,
  onCancel,
}: {
  referral: AuthReferral | undefined;
  saving: boolean;
  saveError: string;
  onSave: (expiresAtLocal: string) => void;
  onCancel: () => void;
}) {
  const [expiresAtLocal, setExpiresAtLocal] = useState(
    referral ? millisToDatetimeLocal(referral.expiresAt) : '',
  );

  function handleSubmit() {
    onSave(expiresAtLocal);
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Referral Detail</p>
          <h2>Edit Expiration</h2>
        </div>
        <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {saveError && <p className="error spaced-below">{saveError}</p>}
      <dl className="kv-list">
        <dt>Code</dt>
        <dd className="kv-mono">{referral?.code || '—'}</dd>
      </dl>
      <div className="form-fields">
        <label className="form-field">
          <span className="form-label">Expires At</span>
          <input
            className="form-input"
            type="datetime-local"
            value={expiresAtLocal}
            onChange={(e) => setExpiresAtLocal(e.target.value)}
            disabled={saving}
          />
        </label>
      </div>
      <button
        className="button primary spaced-above"
        type="button"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Expiration'}
      </button>
    </section>
  );
}
