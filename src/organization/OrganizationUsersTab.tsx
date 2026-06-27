import { useState } from 'react';
import type { AuthOrgUser } from './organizationData';
import { truncateUUID } from '../types';

interface Props {
  users: AuthOrgUser[];
  includeSubtree: boolean;
  onToggleSubtree: (include: boolean) => void;
  allUsers: AuthOrgUser[];
  onMoveUser: (userId: string) => void;
  moving: boolean;
  moveError: string;
}

export function OrganizationUsersTab({ users, includeSubtree, onToggleSubtree, allUsers, onMoveUser, moving, moveError }: Props) {
  const existingIds = new Set(users.map((u) => u.userId));
  const availableUsers = allUsers.filter((u) => !existingIds.has(u.userId));

  return (
    <div className="spaced-above">
      <label className="org-toggle-label">
        <input
          type="checkbox"
          checked={includeSubtree}
          onChange={(e) => onToggleSubtree(e.target.checked)}
        />
        Include users from sub-OUs
      </label>

      {moveError && <p className="error spaced-below">{moveError}</p>}

      {users.length === 0 ? (
        <p className="muted">No users in this organizational unit.</p>
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
            {users.map((user) => (
              <tr key={user.userId}>
                <td className="kv-mono">{truncateUUID(user.userId)}</td>
                <td>{user.provider || '—'}</td>
                <td className="kv-mono">{user.issuer || '—'}</td>
                <td className="kv-mono">{user.primaryOuId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {availableUsers.length > 0 && (
        <div className="spaced-above">
          <h3 className="form-label">Move User to This OU</h3>
          <select
            className="form-input"
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                onMoveUser(value);
                e.target.value = '';
              }
            }}
            disabled={moving}
            defaultValue=""
          >
            <option value="" disabled>
              {moving ? 'Moving…' : 'Select a user to move…'}
            </option>
            {availableUsers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.userId}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
