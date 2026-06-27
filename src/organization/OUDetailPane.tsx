import { Trash2 } from 'lucide-react';
import type { PolicyOption } from '../users/userData';
import type { ManagerState, DirectReportsState } from './ManagerPanel';
import { ManagerPanel } from './ManagerPanel';
import { OrganizationPoliciesTab } from './OrganizationPoliciesTab';
import { OrganizationUsersTab } from './OrganizationUsersTab';
import type { AuthOrgUnit, AuthOrgUser } from './organizationData';
import type { DetailLoadState, UsersLoadState, PoliciesLoadState } from './organizationState';

interface OUDetailPaneProps {
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
  onAttach: (policyId: string, enforced: boolean) => void;
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
  isConfirmingDelete: boolean;
  saving: boolean;
}

export function OUDetailPane({
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
}: OUDetailPaneProps) {
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
