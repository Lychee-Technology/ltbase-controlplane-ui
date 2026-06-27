import { useState } from 'react';
import { truncateUUID } from '../types';
import type { ManagerResult, AuthOrgUser } from './organizationData';

interface Props {
  managerState: ManagerState;
  allUsers: AuthOrgUser[];
  onSelectUser: (userId: string) => void;
  onSetManager: (reportToUserId: string) => void;
  onClearManager: () => void;
  saving: boolean;
  saveError: string;
  directReportsState: DirectReportsState;
  directReportsRecursive: boolean;
  onToggleDirectReportsRecursive: (recursive: boolean) => void;
}

export type ManagerState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: ManagerResult };

export type DirectReportsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; reports: AuthOrgUser[] };

export function ManagerPanel({
  managerState,
  allUsers,
  onSelectUser,
  onSetManager,
  onClearManager,
  saving,
  saveError,
  directReportsState,
  directReportsRecursive,
  onToggleDirectReportsRecursive,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState('');

  function handleSetManager() {
    if (selectedUserId) {
      onSetManager(selectedUserId);
    }
  }

  return (
    <div className="org-manager-section">
      <p className="eyebrow">Manager</p>

      {saveError && <p className="error spaced-below">{saveError}</p>}

      <div className="form-fields">
        <label className="form-field" htmlFor="manager-user-select">
          <span className="form-label">Select User</span>
          <select
            id="manager-user-select"
            className="form-input"
            value={selectedUserId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedUserId(value);
              if (value) {
                onSelectUser(value);
              }
            }}
            disabled={saving}
          >
            <option value="">Select a user…</option>
            {allUsers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.userId}
              </option>
            ))}
          </select>
        </label>
      </div>

      {managerState.kind === 'loading' && <p className="muted">Loading manager info…</p>}
      {managerState.kind === 'error' && <p className="error">{managerState.message}</p>}

      {managerState.kind === 'ready' && (
        <div>
          <div className="org-manager-row">
            <span className="form-label">Reports To:</span>
            <span className="kv-mono">
              {managerState.result.manager ? managerState.result.manager.userId : 'No manager'}
            </span>
          </div>

          <div className="org-toolbar">
            <label className="form-field" htmlFor="manager-reports-to-select">
              <span className="form-label">Set Manager</span>
              <select
                id="manager-reports-to-select"
                className="form-input"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    onSetManager(value);
                    e.target.value = '';
                  }
                }}
                disabled={saving}
                defaultValue=""
              >
                <option value="" disabled>
                  {saving ? 'Saving…' : 'Select a manager…'}
                </option>
                {allUsers
                  .filter((u) => u.userId !== managerState.result.user.userId)
                  .map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userId}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className="button ghost"
              type="button"
              onClick={onClearManager}
              disabled={saving || !managerState.result.manager}
            >
              Clear Manager
            </button>
          </div>
        </div>
      )}

      <div className="org-manager-section">
        <p className="eyebrow">Direct Reports</p>
        <label className="org-toggle-label">
          <input
            type="checkbox"
            checked={directReportsRecursive}
            onChange={(e) => onToggleDirectReportsRecursive(e.target.checked)}
          />
          Include indirect reports (recursive)
        </label>

        {directReportsState.kind === 'loading' && <p className="muted">Loading direct reports…</p>}
        {directReportsState.kind === 'error' && <p className="error">{directReportsState.message}</p>}

        {directReportsState.kind === 'ready' && (
          <>
            {directReportsState.reports.length === 0 ? (
              <p className="muted">No direct reports.</p>
            ) : (
              <table className="policy-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Provider</th>
                    <th>OU</th>
                  </tr>
                </thead>
                <tbody>
                  {directReportsState.reports.map((user) => (
                    <tr key={user.userId}>
                      <td className="kv-mono">{truncateUUID(user.userId)}</td>
                      <td>{user.provider || '—'}</td>
                      <td className="kv-mono">{user.primaryOuId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
