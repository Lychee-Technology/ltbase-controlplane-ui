import { useState } from 'react';
import type { AuthUser, OuOption } from './userData';

export interface UserOrgFormValue {
  primaryOuId: string;
  reportToUserId: string;
}

interface Props {
  user: AuthUser;
  ouOptions: OuOption[];
  managerOptions: Array<{ userId: string }>;
  saving: boolean;
  onSave: (value: UserOrgFormValue) => void;
  onCancel: () => void;
}

export function UserOrgForm({ user, ouOptions, managerOptions, saving, onSave, onCancel }: Props) {
  const [primaryOuId, setPrimaryOuId] = useState(user.primaryOuId);
  const [reportToUserId, setReportToUserId] = useState(user.reportToUserId);

  function handleSubmit() {
    onSave({ primaryOuId, reportToUserId });
  }

  const ouLabel = ouOptions.find((o) => o.ouId === user.primaryOuId)?.name ?? user.primaryOuId;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Edit Organization</p>
          <h2>{user.userId || 'User'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="form-fields">
        <div className="role-readonly-fields">
          <label className="form-field">
            <span className="form-label">Provider</span>
            <input className="form-input" type="text" value={user.provider || '—'} readOnly disabled />
          </label>
          <label className="form-field">
            <span className="form-label">Issuer</span>
            <input className="form-input" type="text" value={user.issuer || '—'} readOnly disabled />
          </label>
          <label className="form-field">
            <span className="form-label">External Sub</span>
            <input className="form-input" type="text" value={user.externalSub || '—'} readOnly disabled />
          </label>
        </div>

        <label className="form-field" htmlFor="user-org-ou-select">
          <span className="form-label">Primary OU</span>
          <select
            id="user-org-ou-select"
            className="form-input"
            value={primaryOuId}
            onChange={(e) => setPrimaryOuId(e.target.value)}
            disabled={saving}
          >
            {!primaryOuId && <option value="">Select an OU…</option>}
            {ouOptions.map((ou) => (
              <option key={ou.ouId} value={ou.ouId}>
                {ou.name !== ou.ouId ? `${ou.name} (${ou.ouId})` : ou.ouId}
              </option>
            ))}
          </select>
          {user.primaryOuId && (
            <span className="muted" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Current: {ouLabel}
            </span>
          )}
        </label>

        <label className="form-field" htmlFor="user-org-manager-select">
          <span className="form-label">Reports To</span>
          <select
            id="user-org-manager-select"
            className="form-input"
            value={reportToUserId}
            onChange={(e) => setReportToUserId(e.target.value)}
            disabled={saving}
          >
            <option value="">No manager</option>
            {managerOptions.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
