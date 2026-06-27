import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import './users.css';
import {
  buildAuthConfigIndexes,
  parseUserList,
  parseUserDetail,
  parseRolePickerOptions,
  parsePolicyPickerOptions,
  parseUserPolicyAttachments,
  parseOuPickerOptions,
  buildUserLabelIndex,
} from './userData';
import type {
  AuthUser,
  AuthConfigIndexes,
  RoleOption,
  PolicyOption,
  UserRoleAttachment,
  UserPolicyAttachment,
  OuOption,
} from './userData';
import { UserOrgForm } from './UserOrgForm';
import type { UserOrgFormValue } from './UserOrgForm';

function isOrgCycleError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'invalid_org_cycle'
  );
}

type Page =
  | { kind: 'list' }
  | { kind: 'detail'; userId: string }
  | { kind: 'edit-org'; userId: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; users: AuthUser[] };

type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; user: AuthUser; roles: UserRoleAttachment[] };

type IndexesLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; authIndexes: AuthConfigIndexes; ouOptions: OuOption[]; roleOptions: RoleOption[]; policyOptions: PolicyOption[] };

type PolicyLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; attachments: UserPolicyAttachment[] };

interface FilterValues {
  q: string;
  provider: string;
  ou_id: string;
  manager_user_id: string;
}

export function UserWorkspace({
  client,
  initialUserId,
  onInitialUserConsumed,
}: {
  client: ControlPlaneClient | null;
  initialUserId?: string | null;
  onInitialUserConsumed?: () => void;
}) {
  const [page, setPage] = useState<Page>({ kind: 'list' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
  const [detail, setDetail] = useState<DetailLoadState>({ kind: 'idle' });
  const [indexes, setIndexes] = useState<IndexesLoadState>({ kind: 'idle' });
  const [filters, setFilters] = useState<FilterValues>({ q: '', provider: '', ou_id: '', manager_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [roleTab, setRoleTab] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [policyTab, setPolicyTab] = useState(false);
  const [policies, setPolicies] = useState<PolicyLoadState>({ kind: 'idle' });
  const consumedInitialUserRef = useRef(false);

  const loadList = useCallback(async () => {
    if (!client) {
      setList({ kind: 'idle' });
      return;
    }
    setList({ kind: 'loading' });
    try {
      const payload = await client.listUsers({
        q: filters.q || undefined,
        provider: filters.provider || undefined,
        ou_id: filters.ou_id || undefined,
        manager_user_id: filters.manager_user_id || undefined,
      });
      const users = parseUserList(payload);
      setList({ kind: 'ready', users });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client, filters]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!initialUserId) {
      // Reset so the next requested user (after the parent clears this one) opens.
      consumedInitialUserRef.current = false;
      return;
    }
    if (client && list.kind === 'ready' && !consumedInitialUserRef.current) {
      consumedInitialUserRef.current = true;
      selectUser(initialUserId);
      onInitialUserConsumed?.();
    }
  }, [initialUserId, client, list.kind, onInitialUserConsumed]);

  useEffect(() => {
    if (!client) {
      return;
    }
    setIndexes({ kind: 'loading' });
    Promise.all([
      client.getAuthConfig(),
      client.listRoles(),
      client.listPolicies(),
    ])
      .then(([authConfig, rolesPayload, policiesPayload]) => {
        const authIndexes = buildAuthConfigIndexes(authConfig);
        setIndexes({
          kind: 'ready',
          authIndexes: authIndexes,
          ouOptions: parseOuPickerOptions(authConfig),
          roleOptions: parseRolePickerOptions(rolesPayload),
          policyOptions: parsePolicyPickerOptions(policiesPayload),
        });
      })
      .catch((error: unknown) => {
        setIndexes({ kind: 'error', message: formatControlPlaneError(error) });
      });
  }, [client]);

  async function loadDetail(userId: string) {
    if (!client) {
      return;
    }
    setDetail({ kind: 'loading' });
    try {
      const payload = await client.getUser(userId);
      const parsed = parseUserDetail(payload);
      setDetail({ kind: 'ready', user: parsed.user, roles: parsed.roles });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  async function loadPolicies(userId: string) {
    if (!client) {
      return;
    }
    setPolicies({ kind: 'loading' });
    setAttachError('');
    try {
      const payload = await client.listUserPolicies(userId);
      const attachments = parseUserPolicyAttachments(payload);
      setPolicies({ kind: 'ready', attachments });
    } catch (error: unknown) {
      setPolicies({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  function selectUser(userId: string) {
    setPage({ kind: 'detail', userId });
    setDetail({ kind: 'loading' });
    setRoleTab(false);
    setPolicyTab(false);
    setPolicies({ kind: 'idle' });
    void loadDetail(userId);
  }

  async function handleOrgSave(userId: string, value: UserOrgFormValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await client.moveUserToOrgUnit(value.primaryOuId, userId);
      if (value.reportToUserId) {
        await client.setUserManager(userId, { report_to_user_id: value.reportToUserId });
      } else {
        await client.clearUserManager(userId);
      }
      await loadList();
      void loadDetail(userId);
      setPage({ kind: 'detail', userId });
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isOrgCycleError(error)) {
        setSaveError(`Cannot update reporting line because it would create an organization cycle. (${message})`);
      } else {
        setSaveError(message);
      }
      setPage({ kind: 'detail', userId });
    } finally {
      setSaving(false);
    }
  }

  async function handleAttachRole(userId: string, roleId: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.attachUserRole(userId, roleId);
      void loadDetail(userId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleDetachRole(userId: string, roleId: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.detachUserRole(userId, roleId);
      void loadDetail(userId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleAttachPolicy(userId: string, policyId: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.attachUserPolicy(userId, policyId);
      void loadPolicies(userId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleDetachPolicy(userId: string, policyId: string) {
    if (!client) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.detachUserPolicy(userId, policyId);
      void loadPolicies(userId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  function handleFilterChange(next: Partial<FilterValues>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage({ kind: 'list' });
    setDetail({ kind: 'idle' });
  }

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Users</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage users.</p>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Users</h2>
          </div>
        </div>
        <p className="muted">Loading users…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Users</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost spaced-above" type="button" onClick={() => void loadList()}>
          Retry
        </button>
      </section>
    );
  }

  const { users } = list;
  const userIndex = buildUserLabelIndex(users);
  const currentDetail = page.kind === 'detail' || page.kind === 'edit-org';

  if (page.kind === 'edit-org') {
    const editingUser = users.find((u) => u.userId === page.userId);
    if (editingUser && indexes.kind === 'error') {
      return (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">User Detail</p>
              <h2>Edit Organization</h2>
            </div>
          </div>
          <p className="error">{indexes.message}</p>
          <button
            className="button ghost spaced-above"
            type="button"
            onClick={() => setPage({ kind: 'detail', userId: page.userId })}
          >
            Back
          </button>
        </section>
      );
    }
    if (!editingUser || indexes.kind !== 'ready') {
      return null;
    }
    const managerOptions = users
      .filter((u) => u.userId !== page.userId)
      .map((u) => ({ userId: u.userId }));
    return (
      <UserOrgForm
        user={editingUser}
        ouOptions={indexes.ouOptions}
        managerOptions={managerOptions}
        saving={saving}
        onSave={(value) => void handleOrgSave(page.userId, value)}
        onCancel={() => setPage({ kind: 'detail', userId: page.userId })}
      />
    );
  }

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Identity & Access</p>
            <h2>Users</h2>
          </div>
        </div>

        <div className="filter-section spaced-below">
          <div className="filter-grid">
            <label className="form-field">
              <span className="form-label">Search</span>
              <input
                className="form-input"
                type="text"
                value={filters.q}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
                placeholder="user_id, provider, issuer…"
              />
            </label>
            <label className="form-field" htmlFor="filter-provider">
              <span className="form-label">Provider</span>
              <input
                id="filter-provider"
                className="form-input"
                type="text"
                value={filters.provider}
                onChange={(e) => handleFilterChange({ provider: e.target.value })}
                placeholder="google, github…"
              />
            </label>
            <label className="form-field" htmlFor="filter-ou">
              <span className="form-label">OU ID</span>
              <input
                id="filter-ou"
                className="form-input"
                type="text"
                value={filters.ou_id}
                onChange={(e) => handleFilterChange({ ou_id: e.target.value })}
                placeholder="ou-root"
              />
            </label>
            <label className="form-field" htmlFor="filter-manager">
              <span className="form-label">Manager</span>
              <input
                id="filter-manager"
                className="form-input"
                type="text"
                value={filters.manager_user_id}
                onChange={(e) => handleFilterChange({ manager_user_id: e.target.value })}
                placeholder="user-mgr"
              />
            </label>
          </div>
        </div>

        {users.length === 0 ? (
          <p className="muted">No users found. Adjust filters or sign in with a configured provider.</p>
        ) : (
          <table className="policy-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Provider</th>
                <th>Issuer</th>
                <th>OU</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const ouLabel = indexes.kind === 'ready'
                  ? (indexes.authIndexes.ouLabelById.get(user.primaryOuId) ?? user.primaryOuId)
                  : user.primaryOuId;
                return (
                  <tr
                    key={user.userId}
                    className={page.kind === 'detail' && page.userId === user.userId ? 'row-selected' : ''}
                    onClick={() => selectUser(user.userId)}
                  >
                    <td className="kv-mono">{truncateUUID(user.userId)}</td>
                    <td>{user.provider || '—'}</td>
                    <td className="kv-mono">{user.issuer || '—'}</td>
                    <td>{ouLabel || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {currentDetail && (
        <UserDetailPane
          state={detail}
          indexes={indexes}
          userIndex={userIndex}
          onEditOrg={(id) => setPage({ kind: 'edit-org', userId: id })}
          saveError={saveError}
          saving={saving}
          roleTab={roleTab}
          onToggleRoleTab={(userId) => {
            const next = !roleTab;
            setRoleTab(next);
            setPolicyTab(false);
            if (next && detail.kind === 'ready') {
              void loadDetail(userId);
            }
          }}
          roleOptions={indexes.kind === 'ready' ? indexes.roleOptions : []}
          attaching={attaching}
          attachError={attachError}
          onAttachRole={(roleId) => {
            const userId = page.kind === 'detail' ? page.userId : '';
            if (userId) {
              void handleAttachRole(userId, roleId);
            }
          }}
          onDetachRole={(roleId) => {
            const userId = page.kind === 'detail' ? page.userId : '';
            if (userId) {
              void handleDetachRole(userId, roleId);
            }
          }}
          policyTab={policyTab}
          onTogglePolicyTab={(userId) => {
            const next = !policyTab;
            setPolicyTab(next);
            setRoleTab(false);
            if (next) {
              void loadPolicies(userId);
            }
          }}
          policies={policies}
          allPolicies={indexes.kind === 'ready' ? indexes.policyOptions : []}
          onAttachPolicy={(policyId) => {
            const userId = page.kind === 'detail' ? page.userId : '';
            if (userId) {
              void handleAttachPolicy(userId, policyId);
            }
          }}
          onDetachPolicy={(policyId) => {
            const userId = page.kind === 'detail' ? page.userId : '';
            if (userId) {
              void handleDetachPolicy(userId, policyId);
            }
          }}
        />
      )}
    </div>
  );
}

function UserDetailPane({
  state,
  indexes,
  userIndex,
  onEditOrg,
  saveError,
  saving,
  roleTab,
  onToggleRoleTab,
  roleOptions,
  attaching,
  attachError,
  onAttachRole,
  onDetachRole,
  policyTab,
  onTogglePolicyTab,
  policies,
  allPolicies,
  onAttachPolicy,
  onDetachPolicy,
}: {
  state: DetailLoadState;
  indexes: IndexesLoadState;
  userIndex: Map<string, string>;
  onEditOrg: (userId: string) => void;
  saveError: string;
  saving: boolean;
  roleTab: boolean;
  onToggleRoleTab: (userId: string) => void;
  roleOptions: RoleOption[];
  attaching: boolean;
  attachError: string;
  onAttachRole: (roleId: string) => void;
  onDetachRole: (roleId: string) => void;
  policyTab: boolean;
  onTogglePolicyTab: (userId: string) => void;
  policies: PolicyLoadState;
  allPolicies: PolicyOption[];
  onAttachPolicy: (policyId: string) => void;
  onDetachPolicy: (policyId: string) => void;
}) {
  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <section className="panel">
        <p className="muted">Loading user details…</p>
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

  const { user, roles } = state;
  const readyIndexes = indexes.kind === 'ready' ? indexes.authIndexes : null;
  const referralCode = readyIndexes?.referralCodeByUserId.get(user.userId) ?? user.referralCode;
  const ouLabel = readyIndexes?.ouLabelById.get(user.primaryOuId) ?? user.primaryOuId;
  const managerLabel = user.reportToUserId ? (userIndex.get(user.reportToUserId) ?? user.reportToUserId) : '';

  const attachedRoleIds = roles.map((r) => r.roleId);
  const availableRoles = roleOptions.filter(
    (r) => !attachedRoleIds.includes(r.roleId),
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">User Detail</p>
          <h2>{user.userId || 'Unnamed User'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={() => onEditOrg(user.userId)} disabled={saving}>
            Edit Org
          </button>
        </div>
      </div>

      {saveError && <p className="error spaced-below">{saveError}</p>}
      {indexes.kind === 'error' && (
        <p className="error spaced-below">Could not load OU, role, and policy options: {indexes.message}</p>
      )}

      <dl className="kv-list">
        <dt>User ID</dt>
        <dd className="kv-mono">{user.userId || '—'}</dd>
        <dt>Provider</dt>
        <dd>{user.provider || '—'}</dd>
        <dt>Issuer</dt>
        <dd className="kv-mono">{user.issuer || '—'}</dd>
        <dt>External Sub</dt>
        <dd className="kv-mono">{user.externalSub || '—'}</dd>
        <dt>Referral Code</dt>
        <dd className="kv-mono">{referralCode || '—'}</dd>
        <dt>Primary OU</dt>
        <dd>{ouLabel || '—'}</dd>
        <dt>Reports To</dt>
        <dd>{managerLabel || '—'}</dd>
        <dt>Last Login</dt>
        <dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</dd>
      </dl>

      <div className="panel-section">
        <button
          className={`button ${roleTab ? 'primary' : 'ghost'}`}
          type="button"
          onClick={() => onToggleRoleTab(user.userId)}
        >
          Roles ({roles.length})
        </button>
        <button
          className={`button user-tab-button-gap ${policyTab ? 'primary' : 'ghost'}`}
          type="button"
          onClick={() => onTogglePolicyTab(user.userId)}
        >
          Direct Policies
        </button>
      </div>

      {roleTab && (
        <div className="spaced-above">
          {attachError && <p className="error spaced-below">{attachError}</p>}

          <h3 className="form-label">Assigned Roles</h3>
          {roles.length === 0 ? (
            <p className="muted">No roles assigned to this user.</p>
          ) : (
            <table className="policy-table">
              <thead>
                <tr>
                  <th>Role ID</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.roleId}>
                    <td className="kv-mono">{truncateUUID(role.roleId)}</td>
                    <td>{role.name || '—'}</td>
                    <td className="kv-mono">{role.slug || '—'}</td>
                    <td>
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() => onDetachRole(role.roleId)}
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

          {availableRoles.length > 0 && (
            <div className="spaced-above">
              <h3 className="form-label">Assign a Role</h3>
              <select
                className="form-input"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    onAttachRole(value);
                    e.target.value = '';
                  }
                }}
                disabled={attaching}
                defaultValue=""
              >
                <option value="" disabled>
                  {attaching ? 'Assigning…' : 'Select a role to assign…'}
                </option>
                {availableRoles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.name || r.roleId} {r.slug ? `(${r.slug})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {policyTab && (
        <UserPolicyTab
          policies={policies}
          allPolicies={allPolicies}
          attaching={attaching}
          attachError={attachError}
          onAttach={onAttachPolicy}
          onDetach={onDetachPolicy}
        />
      )}
    </section>
  );
}

function UserPolicyTab({
  policies,
  allPolicies,
  attaching,
  attachError,
  onAttach,
  onDetach,
}: {
  policies: PolicyLoadState;
  allPolicies: PolicyOption[];
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

  const attachedPolicyIds = attachments.map((a) => a.policyId).concat(
    attachments.map((a) => a.policy.slug).filter(Boolean),
  );

  const availablePolicies = allPolicies.filter(
    (p) => !attachedPolicyIds.includes(p.policyId) && !attachedPolicyIds.includes(p.slug),
  );

  return (
    <div className="spaced-above">
      {attachError && <p className="error spaced-below">{attachError}</p>}

      <h3 className="form-label">Directly Attached Policies</h3>
      {attachments.length === 0 ? (
        <p className="muted">No policies directly attached to this user.</p>
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
