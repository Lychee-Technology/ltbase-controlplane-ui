import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError, truncateUUID } from '../types';
import type { PolicyOption } from '../users/userData';
import { parseUserList, parsePolicyPickerOptions } from '../users/userData';
import type { ManagerState, DirectReportsState } from './ManagerPanel';
import { ManagerPanel } from './ManagerPanel';
import { OrganizationPoliciesTab } from './OrganizationPoliciesTab';
import { OrganizationTree } from './OrganizationTree';
import { OrganizationUnitForm } from './OrganizationUnitForm';
import type { OrgUnitCreateValue, OrgUnitUpdateValue } from './OrganizationUnitForm';
import { OrganizationUsersTab } from './OrganizationUsersTab';
import {
  buildOrgTree,
  filterParentOptions,
  parseDirectReports,
  parseManagerFromNotFound,
  parseManagerResult,
  parseOrgUnitDetail,
  parseOrgUnitList,
  parseOrgUnitPolicies,
  parseOrgUnitUsers,
} from './organizationData';
import type { AuthOrgUnit, AuthOrgUser, OrgUnitPolicyAttachment, OrgTree } from './organizationData';
import './organization.css';

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'not_found'
  );
}

function isOrgCycleError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'invalid_org_cycle'
  );
}

function isOuNotEmptyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'ou_not_empty'
  );
}

type Page =
  | { kind: 'tree' }
  | { kind: 'create' }
  | { kind: 'edit'; ouId: string };

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; units: AuthOrgUnit[]; tree: OrgTree[] };

type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; unit: AuthOrgUnit };

type UsersLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; users: AuthOrgUser[] };

type PoliciesLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; attachments: OrgUnitPolicyAttachment[] };

export function OrganizationWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [page, setPage] = useState<Page>({ kind: 'tree' });
  const [list, setList] = useState<LoadState>({ kind: 'idle' });
  const [selectedOuId, setSelectedOuId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailLoadState>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [usersTab, setUsersTab] = useState(false);
  const [users, setUsers] = useState<UsersLoadState>({ kind: 'idle' });
  const [includeSubtree, setIncludeSubtree] = useState(false);
  const [allUsers, setAllUsers] = useState<AuthOrgUser[]>([]);
  const [movingUser, setMovingUser] = useState(false);
  const [moveError, setMoveError] = useState('');

  const [policiesTab, setPoliciesTab] = useState(false);
  const [policies, setPolicies] = useState<PoliciesLoadState>({ kind: 'idle' });
  const [allPolicies, setAllPolicies] = useState<PolicyOption[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');

  const [managerTab, setManagerTab] = useState(false);
  const [selectedManagerUserId, setSelectedManagerUserId] = useState<string | null>(null);
  const [managerState, setManagerState] = useState<ManagerState>({ kind: 'idle' });
  const [directReportsState, setDirectReportsState] = useState<DirectReportsState>({ kind: 'idle' });
  const [directReportsRecursive, setDirectReportsRecursive] = useState(false);
  const [managerSaving, setManagerSaving] = useState(false);
  const [managerError, setManagerError] = useState('');

  const loadList = useCallback(async () => {
    if (!client) {
      setList({ kind: 'idle' });
      return;
    }
    setList({ kind: 'loading' });
    try {
      const payload = await client.listOrgUnits({ tree: true });
      const units = parseOrgUnitList(payload);
      const tree = buildOrgTree(units);
      setList({ kind: 'ready', units, tree });
    } catch (error: unknown) {
      setList({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!client || list.kind !== 'ready') {
      return;
    }
    client.listUsers().then((payload) => {
      setAllUsers(parseUserList(payload));
    }).catch(() => {
      setAllUsers([]);
    });
    client.listPolicies().then((payload) => {
      setAllPolicies(parsePolicyPickerOptions(payload));
    }).catch(() => {
      setAllPolicies([]);
    });
  }, [client, list.kind]);

  async function loadDetail(ouId: string) {
    if (!client) {
      return;
    }
    setDetail({ kind: 'loading' });
    try {
      const payload = await client.getOrgUnit(ouId);
      const unit = parseOrgUnitDetail(payload);
      setDetail({ kind: 'ready', unit });
    } catch (error: unknown) {
      setDetail({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  function selectOu(ouId: string) {
    setSelectedOuId(ouId);
    setDetail({ kind: 'loading' });
    setUsersTab(false);
    setUsers({ kind: 'idle' });
    setPoliciesTab(false);
    setPolicies({ kind: 'idle' });
    setManagerTab(false);
    setSaveError('');
    setDeleteError('');
    void loadDetail(ouId);
  }

  async function loadUsers(ouId: string) {
    if (!client) {
      return;
    }
    setUsers({ kind: 'loading' });
    setMoveError('');
    try {
      const payload = await client.listOrgUnitUsers(ouId, { include_subtree: includeSubtree });
      const parsed = parseOrgUnitUsers(payload);
      setUsers({ kind: 'ready', users: parsed });
    } catch (error: unknown) {
      setUsers({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  async function loadPolicies(ouId: string) {
    if (!client) {
      return;
    }
    setPolicies({ kind: 'loading' });
    setAttachError('');
    try {
      const payload = await client.listOrgUnitPolicies(ouId);
      const parsed = parseOrgUnitPolicies(payload);
      setPolicies({ kind: 'ready', attachments: parsed });
    } catch (error: unknown) {
      setPolicies({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  async function loadManager(userId: string) {
    if (!client) {
      return;
    }
    setManagerState({ kind: 'loading' });
    setManagerError('');
    try {
      const payload = await client.getUserManager(userId);
      const result = parseManagerResult(payload);
      setManagerState({ kind: 'ready', result });
      void loadDirectReports(userId);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        const result = parseManagerFromNotFound();
        setManagerState({ kind: 'ready', result });
        setDirectReportsState({ kind: 'ready', reports: [] });
      } else {
        setManagerState({ kind: 'error', message: formatControlPlaneError(error) });
      }
    }
  }

  async function loadDirectReports(userId: string) {
    if (!client) {
      return;
    }
    setDirectReportsState({ kind: 'loading' });
    try {
      const payload = await client.listUserDirectReports(userId, { recursive: directReportsRecursive });
      const reports = parseDirectReports(payload);
      setDirectReportsState({ kind: 'ready', reports });
    } catch (error: unknown) {
      setDirectReportsState({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }

  async function handleCreate(value: OrgUnitCreateValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    try {
      await client.createOrgUnit({
        ou_id: value.ouId,
        name: value.name,
        parent_ou_id: value.parentOuId,
        block_inheritance: value.blockInheritance,
      });
      await loadList();
      setPage({ kind: 'tree' });
      selectOu(value.ouId);
    } catch (error: unknown) {
      setSaveError(formatControlPlaneError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(ouId: string, value: OrgUnitUpdateValue) {
    if (!client) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await client.updateOrgUnit(ouId, {
        name: value.name,
        parent_ou_id: value.parentOuId,
        block_inheritance: value.blockInheritance,
      });
      await loadList();
      void loadDetail(ouId);
      setPage({ kind: 'tree' });
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isOrgCycleError(error)) {
        setSaveError(`Cannot perform this operation because it would create an organization cycle. (${message})`);
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteConfirm(ouId: string) {
    setDeleteConfirmation(ouId);
    setDeleteError('');
  }

  async function handleDelete(ouId: string) {
    if (!client) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await client.deleteOrgUnit(ouId);
      setSelectedOuId(null);
      setDetail({ kind: 'idle' });
      await loadList();
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isOuNotEmptyError(error)) {
        setDeleteError(`Cannot delete: this OU still has child OUs, users, or policy attachments. Remove them first. (${message})`);
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmation(null);
    }
  }

  async function handleMoveUser(userId: string) {
    if (!client || !selectedOuId) {
      return;
    }
    setMovingUser(true);
    setMoveError('');
    try {
      await client.moveUserToOrgUnit(selectedOuId, userId);
      void loadUsers(selectedOuId);
    } catch (error: unknown) {
      setMoveError(formatControlPlaneError(error));
    } finally {
      setMovingUser(false);
    }
  }

  async function handleAttachPolicy(policyId: string) {
    if (!client || !selectedOuId) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.attachOrgUnitPolicy(selectedOuId, policyId, { enforced: false });
      void loadPolicies(selectedOuId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleDetachPolicy(policyId: string) {
    if (!client || !selectedOuId) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.detachOrgUnitPolicy(selectedOuId, policyId);
      void loadPolicies(selectedOuId);
    } catch (error: unknown) {
      setAttachError(formatControlPlaneError(error));
    } finally {
      setAttaching(false);
    }
  }

  async function handleSetManager(reportToUserId: string) {
    if (!client || !selectedManagerUserId) {
      return;
    }
    setManagerSaving(true);
    setManagerError('');
    try {
      await client.setUserManager(selectedManagerUserId, { report_to_user_id: reportToUserId });
      void loadManager(selectedManagerUserId);
    } catch (error: unknown) {
      const message = formatControlPlaneError(error);
      if (isOrgCycleError(error)) {
        setManagerError(`Cannot set this manager: it would create a reporting chain cycle. (${message})`);
      } else {
        setManagerError(message);
      }
    } finally {
      setManagerSaving(false);
    }
  }

  async function handleClearManager() {
    if (!client || !selectedManagerUserId) {
      return;
    }
    setManagerSaving(true);
    setManagerError('');
    try {
      await client.clearUserManager(selectedManagerUserId);
      void loadManager(selectedManagerUserId);
    } catch (error: unknown) {
      setManagerError(formatControlPlaneError(error));
    } finally {
      setManagerSaving(false);
    }
  }

  function handleToggleUsersTab() {
    const next = !usersTab;
    setUsersTab(next);
    setPoliciesTab(false);
    setManagerTab(false);
    if (next && selectedOuId) {
      void loadUsers(selectedOuId);
    }
  }

  function handleTogglePoliciesTab() {
    const next = !policiesTab;
    setPoliciesTab(next);
    setUsersTab(false);
    setManagerTab(false);
    if (next && selectedOuId) {
      void loadPolicies(selectedOuId);
    }
  }

  function handleToggleManagerTab() {
    const next = !managerTab;
    setManagerTab(next);
    setUsersTab(false);
    setPoliciesTab(false);
    if (!next) {
      setSelectedManagerUserId(null);
      setManagerState({ kind: 'idle' });
      setDirectReportsState({ kind: 'idle' });
    }
  }

  function handleSelectManagerUser(userId: string) {
    setSelectedManagerUserId(userId);
    void loadManager(userId);
  }

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Organization</p>
            <h2>Organization Management</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage organization.</p>
      </section>
    );
  }

  if (list.kind === 'loading' || list.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Organization</p>
            <h2>Organization Management</h2>
          </div>
        </div>
        <p className="muted">Loading organization units…</p>
      </section>
    );
  }

  if (list.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Organization</p>
            <h2>Organization Management</h2>
          </div>
        </div>
        <p className="error">{list.message}</p>
        <button className="button ghost spaced-above" type="button" onClick={() => void loadList()}>
          Retry
        </button>
      </section>
    );
  }

  const { units, tree } = list;

  if (page.kind === 'create') {
    const parentOptions = units;
    return (
      <OrganizationUnitForm
        mode="create"
        allUnits={units}
        parentOptions={parentOptions}
        saving={saving}
        onSave={(value) => void handleCreate(value)}
        onCancel={() => setPage({ kind: 'tree' })}
      />
    );
  }

  if (page.kind === 'edit') {
    const editingUnit = units.find((u) => u.ouId === page.ouId);
    if (!editingUnit) {
      return null;
    }
    const parentOptions = filterParentOptions(units, editingUnit.ouId);
    return (
      <OrganizationUnitForm
        mode="edit"
        unit={editingUnit}
        allUnits={units}
        parentOptions={parentOptions}
        saving={saving}
        onSave={(value) => void handleUpdate(page.ouId, value)}
        onCancel={() => setPage({ kind: 'tree' })}
      />
    );
  }

  const selectedUnit = selectedOuId && detail.kind === 'ready' ? detail.unit : null;
  const isConfirmingDelete = deleteConfirmation === selectedOuId;

  return (
    <div className="policy-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Organization</p>
            <h2>Organization Units</h2>
          </div>
          <button className="button primary" type="button" onClick={() => setPage({ kind: 'create' })}>
            <Plus size={16} /> Create
          </button>
        </div>

        {saveError && <p className="error spaced-below">{saveError}</p>}

        {tree.length === 0 ? (
          <p className="muted">No organizational units defined. Create one to get started.</p>
        ) : (
          <OrganizationTree
            tree={tree}
            selectedOuId={selectedOuId}
            onSelect={selectOu}
          />
        )}
      </section>

      {selectedUnit && (
        <OUDetailPane
          unit={selectedUnit}
          detail={detail}
          usersTab={usersTab}
          onToggleUsersTab={handleToggleUsersTab}
          users={users}
          includeSubtree={includeSubtree}
          onToggleSubtree={(value) => {
            setIncludeSubtree(value);
            if (selectedOuId) {
              void loadUsers(selectedOuId);
            }
          }}
          allUsers={allUsers}
          onMoveUser={(userId) => void handleMoveUser(userId)}
          movingUser={movingUser}
          moveError={moveError}
          policiesTab={policiesTab}
          onTogglePoliciesTab={handleTogglePoliciesTab}
          policies={policies}
          allPolicies={allPolicies}
          onAttach={(policyId) => void handleAttachPolicy(policyId)}
          onDetach={(policyId) => void handleDetachPolicy(policyId)}
          attaching={attaching}
          attachError={attachError}
          managerTab={managerTab}
          onToggleManagerTab={handleToggleManagerTab}
          managerState={managerState}
          allUsersForManager={allUsers}
          onSelectManagerUser={handleSelectManagerUser}
          onSetManager={(reportToUserId) => void handleSetManager(reportToUserId)}
          onClearManager={() => void handleClearManager()}
          managerSaving={managerSaving}
          managerError={managerError}
          directReportsState={directReportsState}
          directReportsRecursive={directReportsRecursive}
          onToggleDirectReportsRecursive={(recursive) => {
            setDirectReportsRecursive(recursive);
            if (selectedManagerUserId) {
              void loadDirectReports(selectedManagerUserId);
            }
          }}
          onEdit={() => {
            if (selectedOuId) {
              setPage({ kind: 'edit', ouId: selectedOuId });
            }
          }}
          onDelete={handleDeleteConfirm}
          deleteConfirmation={deleteConfirmation}
          deleting={deleting}
          deleteError={deleteError}
          onDeleteConfirm={(id) => void handleDelete(id)}
          onDeleteCancel={() => {
            setDeleteConfirmation(null);
            setDeleteError('');
          }}
          isConfirmingDelete={isConfirmingDelete}
          saving={saving}
        />
      )}
    </div>
  );
}

function OUDetailPane({
  unit,
  detail,
  usersTab,
  onToggleUsersTab,
  users,
  includeSubtree,
  onToggleSubtree,
  allUsers,
  onMoveUser,
  movingUser,
  moveError,
  policiesTab,
  onTogglePoliciesTab,
  policies,
  allPolicies,
  onAttach,
  onDetach,
  attaching,
  attachError,
  managerTab,
  onToggleManagerTab,
  managerState,
  allUsersForManager,
  onSelectManagerUser,
  onSetManager,
  onClearManager,
  managerSaving,
  managerError,
  directReportsState,
  directReportsRecursive,
  onToggleDirectReportsRecursive,
  onEdit,
  onDelete,
  deleteConfirmation,
  deleting,
  deleteError,
  onDeleteConfirm,
  onDeleteCancel,
  isConfirmingDelete,
  saving,
}: {
  unit: AuthOrgUnit;
  detail: DetailLoadState;
  usersTab: boolean;
  onToggleUsersTab: () => void;
  users: UsersLoadState;
  includeSubtree: boolean;
  onToggleSubtree: (value: boolean) => void;
  allUsers: AuthOrgUser[];
  onMoveUser: (userId: string) => void;
  movingUser: boolean;
  moveError: string;
  policiesTab: boolean;
  onTogglePoliciesTab: () => void;
  policies: PoliciesLoadState;
  allPolicies: PolicyOption[];
  onAttach: (policyId: string) => void;
  onDetach: (policyId: string) => void;
  attaching: boolean;
  attachError: string;
  managerTab: boolean;
  onToggleManagerTab: () => void;
  managerState: ManagerState;
  allUsersForManager: AuthOrgUser[];
  onSelectManagerUser: (userId: string) => void;
  onSetManager: (reportToUserId: string) => void;
  onClearManager: () => void;
  managerSaving: boolean;
  managerError: string;
  directReportsState: DirectReportsState;
  directReportsRecursive: boolean;
  onToggleDirectReportsRecursive: (recursive: boolean) => void;
  onEdit: () => void;
  onDelete: (ouId: string) => void;
  deleteConfirmation: string | null;
  deleting: boolean;
  deleteError: string;
  onDeleteConfirm: (ouId: string) => void;
  onDeleteCancel: () => void;
  isConfirmingDelete: boolean | undefined;
  saving: boolean;
}) {
  if (detail.kind === 'loading') {
    return (
      <section className="panel">
        <p className="muted">Loading OU details…</p>
      </section>
    );
  }

  if (detail.kind === 'error') {
    return (
      <section className="panel">
        <p className="error">{detail.message}</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">OU Detail</p>
          <h2>{unit.name || unit.ouId}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onEdit} disabled={saving}>
            Edit
          </button>
          {isConfirmingDelete ? (
            <>
              <button
                className="button danger"
                type="button"
                onClick={() => onDeleteConfirm(unit.ouId)}
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
              onClick={() => onDelete(unit.ouId)}
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {deleteError && <p className="error spaced-below">{deleteError}</p>}

      <dl className="org-detail-kv">
        <dt>OU ID</dt>
        <dd className="kv-mono">{unit.ouId || '—'}</dd>
        <dt>Name</dt>
        <dd>{unit.name || '—'}</dd>
        <dt>Parent OU</dt>
        <dd className="kv-mono">{unit.parentOuId || '—'}</dd>
        <dt>OU Path</dt>
        <dd className="kv-mono">{unit.ouPath || '—'}</dd>
        <dt>Block Inheritance</dt>
        <dd>{unit.blockInheritance ? 'Yes' : 'No'}</dd>
        <dt>Created</dt>
        <dd>{unit.createdAt ? new Date(unit.createdAt).toLocaleString() : '—'}</dd>
        <dt>Updated</dt>
        <dd>{unit.updatedAt ? new Date(unit.updatedAt).toLocaleString() : '—'}</dd>
      </dl>

      <div className="panel-section">
        <div className="org-tab-group">
          <button
            className={`button ${usersTab ? 'primary' : 'ghost'}`}
            type="button"
            onClick={onToggleUsersTab}
          >
            Users
          </button>
          <button
            className={`button ${policiesTab ? 'primary' : 'ghost'}`}
            type="button"
            onClick={onTogglePoliciesTab}
          >
            Policies
          </button>
          <button
            className={`button ${managerTab ? 'primary' : 'ghost'}`}
            type="button"
            onClick={onToggleManagerTab}
          >
            Manager
          </button>
        </div>

        {usersTab && users.kind === 'ready' && (
          <OrganizationUsersTab
            users={users.users}
            includeSubtree={includeSubtree}
            onToggleSubtree={onToggleSubtree}
            allUsers={allUsers}
            onMoveUser={onMoveUser}
            moving={movingUser}
            moveError={moveError}
          />
        )}
        {usersTab && users.kind === 'loading' && <p className="muted spaced-above">Loading users…</p>}
        {usersTab && users.kind === 'error' && <p className="error spaced-above">{users.message}</p>}

        {policiesTab && policies.kind === 'ready' && (
          <OrganizationPoliciesTab
            attachments={policies.attachments}
            allPolicies={allPolicies}
            onAttach={onAttach}
            onDetach={onDetach}
            attaching={attaching}
            attachError={attachError}
          />
        )}
        {policiesTab && policies.kind === 'loading' && <p className="muted spaced-above">Loading policies…</p>}
        {policiesTab && policies.kind === 'error' && <p className="error spaced-above">{policies.message}</p>}

        {managerTab && (
          <ManagerPanel
            managerState={managerState}
            allUsers={allUsersForManager}
            onSelectUser={onSelectManagerUser}
            onSetManager={onSetManager}
            onClearManager={onClearManager}
            saving={managerSaving}
            saveError={managerError}
            directReportsState={directReportsState}
            directReportsRecursive={directReportsRecursive}
            onToggleDirectReportsRecursive={onToggleDirectReportsRecursive}
          />
        )}
      </div>

      <div className="org-delete-section">
        <p className="warning spaced-below">
          Delete is only available for empty OUs with no child OUs, users, or policy attachments.
        </p>
      </div>
    </section>
  );
}
