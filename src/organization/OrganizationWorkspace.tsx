import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError } from '../types';
import type { PolicyOption } from '../users/userData';
import { parseUserList, parsePolicyPickerOptions } from '../users/userData';
import type { ManagerState, DirectReportsState } from './ManagerPanel';
import { OrganizationChart } from './OrganizationChart';
import { OUDetailPane } from './OUDetailPane';
import { OrganizationTree } from './OrganizationTree';
import { OrganizationUnitForm } from './OrganizationUnitForm';
import type { OrgUnitCreateValue, OrgUnitUpdateValue } from './OrganizationUnitForm';
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
import type { AuthOrgUnit, AuthOrgUser } from './organizationData';
import type {
  OrgPage,
  OrgListLoadState,
  DetailLoadState,
  UsersLoadState,
  PoliciesLoadState,
} from './organizationState';
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

export function OrganizationWorkspace({
  client,
  onNavigateUser,
}: {
  client: ControlPlaneClient | null;
  onNavigateUser?: (userId: string) => void;
}) {
  const [view, setView] = useState<'manage' | 'chart'>('manage');
  const [page, setPage] = useState<OrgPage>({ kind: 'tree' });
  const [list, setList] = useState<OrgListLoadState>({ kind: 'idle' });
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
        const result = parseManagerFromNotFound(userId);
        setManagerState({ kind: 'ready', result });
        void loadDirectReports(userId);
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
    setSaveError('');
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

  async function handleAttachPolicy(policyId: string, enforced: boolean) {
    if (!client || !selectedOuId) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await client.attachOrgUnitPolicy(selectedOuId, policyId, { enforced });
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

  function handleChartSelectOu(ouId: string) {
    selectOu(ouId);
    setView('manage');
  }

  function handleChartSelectUser(userId: string) {
    if (onNavigateUser) {
      onNavigateUser(userId);
    }
  }

  const rootOuOptions = list.kind === 'ready' ? list.units.map((u) => ({ ouId: u.ouId, name: u.name })) : [];

  if (view === 'chart') {
    return (
      <div className="policy-layout">
        <OrganizationChart
          client={client}
          rootOuOptions={rootOuOptions}
          onSelectOu={handleChartSelectOu}
          onSelectUser={handleChartSelectUser}
        />
        <div className="org-chart-back-section">
          <button className="button ghost" type="button" onClick={() => setView('manage')}>
            Back to Manage OUs
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Organization</p>
            <h2>Organization Management</h2>
          </div>
          <button className="button ghost" type="button" onClick={() => setView('chart')}>
            Org Chart
          </button>
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
          <button className="button ghost" type="button" onClick={() => setView('chart')}>
            Org Chart
          </button>
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
          <button className="button ghost" type="button" onClick={() => setView('chart')}>
            Org Chart
          </button>
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
        error={saveError}
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
        error={saveError}
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
          <div className="actions">
            <button className="button ghost" type="button" onClick={() => setView('chart')}>
              Org Chart
            </button>
            <button className="button primary" type="button" onClick={() => setPage({ kind: 'create' })}>
              <Plus size={16} /> Create
            </button>
          </div>
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
          onAttach={(policyId, enforced) => void handleAttachPolicy(policyId, enforced)}
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
