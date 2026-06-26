import { Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import { RoleForm } from './RoleForm';
import {
  parseRoleList,
  parseRoleDetail,
  parseRolePolicyAttachments,
  parsePolicyOptions,
  buildParentRoleIndex,
} from './roleData';
import type { AuthRole, PolicyOption, RoleFormValue, RolePolicyAttachment } from './roleData';
import './roles.css';

function isRoleInUseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'role_in_use'
  );
}

type Page =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; roleId: string }
  | { kind: 'edit'; roleId: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; roles: AuthRole[] };

type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; role: AuthRole };

type PolicyLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; attachments: RolePolicyAttachment[] };

export function RoleWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [page, setPage] = useState<Page>({ kind: 'list' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
  const [detail, setDetail] = useState<DetailLoadState>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [jumpInput, setJumpInput] = useState('');
  const [jumpError, setJumpError] = useState('');
  const [jumping, setJumping] = useState(false);

  const [policyTab, setPolicyTab] = useState(false);
  const [policies, setPolicies] = useState<PolicyLoadState>({ kind: 'idle' });
  const [allPolicies, setAllPolicies] = useState<PolicyOption[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');

  const loadList = useCallback(async () => {
    if (!client) {
      setList({ kind: 'idle' });
      return;
    }
    setList({ kind: 'loading' });
    try {
      const payload = await client.listRoles();
      const roles = parseRoleList(payload);
      setList({ kind: 'ready', roles });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function loadDetail(roleId: string) {
    if (!client) {
      return;
    }
    setDetail({ kind: 'loading' });
    try {
      const payload = await client.getRole(roleId);
      const role = parseRoleDetail(payload);
      setDetail({ kind: 'ready', role });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  async function loadPolicies(roleId: string) {
    if (!client) {
      return;
    }
    setPolicies({ kind: 'loading' });
    setAttachError('');
    try {
      const [rolePoliciesPayload, allPoliciesPayload] = await Promise.all([
        client.listRolePolicies(roleId),
        client.listPolicies(),
      ]);
      const attachments = parseRolePolicyAttachments(rolePoliciesPayload);
      setPolicies({ kind: 'ready', attachments });

      setAllPolicies(parsePolicyOptions(allPoliciesPayload));
    } catch (error: unknown) {
      setPolicies({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  function selectRole(roleId: string) {
    setPage({ kind: 'detail', roleId });
    setDetail({ kind: 'loading' });
    setPolicyTab(false);
    setPolicies({ kind: 'idle' });
    void loadDetail(roleId);
  }

  async function handleJump() {
    const ref = jumpInput.trim();
    if (!ref || !client) {
      return;
    }
    setJumping(true);
    setJumpError('');
    try {
      const payload = await client.getRole(ref);
      const role = parseRoleDetail(payload);
      setDetail({ kind: 'ready', role });
      setPage({ kind: 'detail', roleId: role.roleId });
      await loadList();
      setJumpInput('');
      setPolicyTab(false);
      setPolicies({ kind: 'idle' });
    } catch (error: unknown) {
      const msg = formatControlPlaneError(error);
      const errObj = error as Record<string, unknown> | undefined;
      if (errObj?.code === 'not_found') {
        setJumpError('No role found for this role_id or slug');
      } else {
        setJumpError(msg);
      }
    } finally {
      setJumping(false);
    }
  }

  async function handleCreate(value: RoleFormValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    try {
      const result = await client.createRole({
        name: value.name,
        description: value.description,
        parent_role_ids: value.parentRoleIds,
      });
      await loadList();
      const role = parseRoleDetail(result);
      setPage({ kind: 'detail', roleId: role.roleId });
      void loadDetail(role.roleId);
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(roleId: string, value: RoleFormValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    try {
      await client.updateRole(roleId, {
        name: value.name,
        description: value.description,
        parent_role_ids: value.parentRoleIds,
      });
      await loadList();
      void loadDetail(roleId);
      setPage({ kind: 'detail', roleId });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteConfirm(roleId: string) {
    setDeleteConfirmation(roleId);
    setDeleteError('');
  }

  async function handleDelete(roleId: string) {
    if (!client) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await client.deleteRole(roleId);
      setPage({ kind: 'list' });
      setDetail({ kind: 'idle' });
      await loadList();
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isRoleInUseError(error)) {
        setDeleteError(
          `Cannot delete: this role is still in use by users, child roles, or policy attachments. Detach all references first. (${message})`,
        );
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmation(null);
    }
  }

  async function handleAttachPolicy(roleId: string, policyRef: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.attachRolePolicy(roleId, policyRef);
      await loadPolicies(roleId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleDetachPolicy(roleId: string, policyRef: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.detachRolePolicy(roleId, policyRef);
      await loadPolicies(roleId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Roles</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage roles.</p>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Roles</h2>
          </div>
        </div>
        <p className="muted">Loading roles…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Roles</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost spaced-above" type="button" onClick={() => void loadList()}>
          Retry
        </button>
      </section>
    );
  }

  const { roles } = list;
  const parentIndex = buildParentRoleIndex(roles);

  if (page.kind === 'create') {
    return (
      <RoleForm
        mode="create"
        allRoles={roles}
        saving={saving}
        onSave={handleCreate}
        onCancel={() => setPage({ kind: 'list' })}
      />
    );
  }

  if (page.kind === 'edit') {
    const editingRole = roles.find((r) => r.roleId === page.roleId);
    if (!editingRole) {
      return null;
    }
    return (
      <RoleForm
        mode="edit"
        role={editingRole}
        allRoles={roles}
        saving={saving}
        onSave={(value) => void handleUpdate(page.roleId, value)}
        onCancel={() => setPage({ kind: 'detail', roleId: page.roleId })}
      />
    );
  }

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Authorization</p>
            <h2>Roles</h2>
          </div>
          <button className="button primary" type="button" onClick={() => setPage({ kind: 'create' })}>
            <Plus size={16} /> Create
          </button>
        </div>

        <div className="jump-section">
          <div className="jump-input-group">
            <input
              className="form-input"
              type="text"
              value={jumpInput}
              onChange={(e) => {
                setJumpInput(e.target.value);
                setJumpError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleJump();
                }
              }}
              placeholder="Enter role_id or slug"
              disabled={jumping}
            />
            <button
              className="button ghost"
              type="button"
              onClick={() => void handleJump()}
              disabled={jumping || !jumpInput.trim()}
            >
              <Search size={16} /> Open
            </button>
          </div>
          {jumpError && <p className="error form-hint">{jumpError}</p>}
        </div>

        {roles.length === 0 ? (
          <p className="muted">No roles defined. Create one to get started.</p>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>Role ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr
                  key={role.roleId}
                  className={page.kind === 'detail' && page.roleId === role.roleId ? 'row-selected' : ''}
                  onClick={() => selectRole(role.roleId)}
                >
                  <td className="kv-mono">{truncateUUID(role.roleId)}</td>
                  <td>{role.name || '—'}</td>
                  <td className="kv-mono">{role.slug || '—'}</td>
                  <td className="role-desc-preview">{role.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {page.kind === 'detail' && (
        <RoleDetailPane
          state={detail}
          parentIndex={parentIndex}
          onEdit={(id) => setPage({ kind: 'edit', roleId: id })}
          onDelete={(id) => void handleDelete(id)}
          deleteConfirmation={deleteConfirmation}
          deleting={deleting}
          deleteError={deleteError}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={() => {
            setDeleteConfirmation(null);
            setDeleteError('');
          }}
          policyTab={policyTab}
          onTogglePolicyTab={(roleId) => {
            const next = !policyTab;
            setPolicyTab(next);
            if (next) {
              void loadPolicies(roleId);
            }
          }}
          policies={policies}
          allPolicies={allPolicies}
          attaching={attaching}
          attachError={attachError}
          onAttachPolicy={(policyRef) => void handleAttachPolicy(page.roleId, policyRef)}
          onDetachPolicy={(policyRef) => void handleDetachPolicy(page.roleId, policyRef)}
        />
      )}
    </div>
  );
}

function RoleDetailPane({
  state,
  parentIndex,
  onEdit,
  onDelete,
  deleteConfirmation,
  deleting,
  deleteError,
  onDeleteConfirm,
  onDeleteCancel,
  policyTab,
  onTogglePolicyTab,
  policies,
  allPolicies,
  attaching,
  attachError,
  onAttachPolicy,
  onDetachPolicy,
}: {
  state: DetailLoadState;
  parentIndex: Map<string, string>;
  onEdit: (roleId: string) => void;
  onDelete: (roleId: string) => void;
  deleteConfirmation: string | null;
  deleting: boolean;
  deleteError: string;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  policyTab: boolean;
  onTogglePolicyTab: (roleId: string) => void;
  policies: PolicyLoadState;
  allPolicies: PolicyOption[];
  attaching: boolean;
  attachError: string;
  onAttachPolicy: (policyRef: string) => void;
  onDetachPolicy: (policyRef: string) => void;
}) {
  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <section className="panel">
        <p className="muted">Loading role details…</p>
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

  const { role } = state;
  const isConfirming = deleteConfirmation === role.roleId;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Role Detail</p>
          <h2>{role.name || 'Unnamed Role'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={() => onEdit(role.roleId)}>
            Edit
          </button>
          {isConfirming ? (
            <>
              <button
                className="button danger"
                type="button"
                onClick={() => onDelete(role.roleId)}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button className="button ghost" type="button" onClick={onDeleteCancel} disabled={deleting}>
                Cancel
              </button>
            </>
          ) : (
            <button className="button ghost" type="button" onClick={() => onDeleteConfirm(role.roleId)}>
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {deleteError && <p className="error spaced-below">{deleteError}</p>}

      <dl className="kv-list">
        <dt>Role ID</dt>
        <dd className="kv-mono">{role.roleId}</dd>
        <dt>Slug</dt>
        <dd className="kv-mono">{role.slug || '—'}</dd>
        <dt>External Key</dt>
        <dd className="kv-mono">{role.externalKey || '—'}</dd>
        <dt>Description</dt>
        <dd>{role.description || '—'}</dd>
        <dt>Parent Roles</dt>
        <dd>
          {role.parentRoleIds.length === 0 ? (
            <span className="muted">—</span>
          ) : (
            <ul className="reference-list">
              {role.parentRoleIds.map((pid) => (
                <li key={pid} className="kv-mono">
                  {parentIndex.get(pid) ?? pid}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>

      <div className="panel-section">
        <button
          className={`button ${policyTab ? 'primary' : 'ghost'}`}
          type="button"
          onClick={() => onTogglePolicyTab(role.roleId)}
        >
          Policies
        </button>
      </div>

      {policyTab && (
        <RolePolicyTab
          policies={policies}
          allPolicies={allPolicies}
          attachedPolicyIds={
            // A policy may be attached by either its durable id or its slug, so we
            // collect both forms to exclude already-attached policies from the picker.
            policies.kind === 'ready'
              ? policies.attachments.map((a) => a.policyId).concat(
                  policies.attachments.map((a) => a.policy.slug).filter(Boolean),
                )
              : []
          }
          attaching={attaching}
          attachError={attachError}
          onAttach={onAttachPolicy}
          onDetach={onDetachPolicy}
        />
      )}
    </section>
  );
}

function RolePolicyTab({
  policies,
  allPolicies,
  attachedPolicyIds,
  attaching,
  attachError,
  onAttach,
  onDetach,
}: {
  policies: PolicyLoadState;
  allPolicies: PolicyOption[];
  attachedPolicyIds: string[];
  attaching: boolean;
  attachError: string;
  onAttach: (policyRef: string) => void;
  onDetach: (policyRef: string) => void;
}) {
  if (policies.kind === 'loading') {
    return <p className="muted spaced-above">Loading policies…</p>;
  }

  if (policies.kind === 'error') {
    return <p className="error spaced-above">{policies.message}</p>;
  }

  if (policies.kind === 'idle') {
    return null;
  }

  const { attachments } = policies;

  const availablePolicies = allPolicies.filter(
    (p) => !attachedPolicyIds.includes(p.policyId) && !attachedPolicyIds.includes(p.slug),
  );

  return (
    <div className="spaced-above">
      {attachError && <p className="error spaced-below">{attachError}</p>}

      <h3 className="form-label">Attached Policies</h3>
      {attachments.length === 0 ? (
        <p className="muted">No policies directly attached to this role.</p>
      ) : (
        <table className="policy-table">
          <thead>
            <tr>
              <th>Policy ID</th>
              <th>Name</th>
              <th>Slug</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attachments.map((a) => (
              <tr key={a.policyId}>
                <td className="kv-mono">{truncateUUID(a.policy.policyId)}</td>
                <td>{a.policy.name || '—'}</td>
                <td className="kv-mono">{a.policy.slug || '—'}</td>
                <td>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => onDetach(a.policyId)}
                    disabled={attaching}
                  >
                    <Trash2 size={14} /> Detach
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {availablePolicies.length > 0 && (
        <div className="spaced-above">
          <h3 className="form-label">Attach a Policy</h3>
          <select
            className="form-input"
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                onAttach(value);
                e.target.value = '';
              }
            }}
            disabled={attaching}
            defaultValue=""
          >
            <option value="" disabled>
              {attaching ? 'Attaching…' : 'Select a policy to attach…'}
            </option>
            {availablePolicies.map((p) => (
              <option key={p.policyId} value={p.policyId}>
                {p.name || p.policyId} {p.slug ? `(${p.slug})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
