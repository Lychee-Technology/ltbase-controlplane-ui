import { Trash2 } from 'lucide-react';
import { truncateUUID } from '../types';
import type { OrgUnitPolicyAttachment } from './organizationData';

interface PolicyOption {
  policyId: string;
  name: string;
  slug: string;
}

interface Props {
  attachments: OrgUnitPolicyAttachment[];
  allPolicies: PolicyOption[];
  onAttach: (policyId: string) => void;
  onDetach: (policyId: string) => void;
  attaching: boolean;
  attachError: string;
}

export function OrganizationPoliciesTab({ attachments, allPolicies, onAttach, onDetach, attaching, attachError }: Props) {
  const attachedIds = new Set(attachments.map((a) => a.policyId));
  const availablePolicies = allPolicies.filter((p) => !attachedIds.has(p.policyId));

  return (
    <div className="spaced-above">
      {attachError && <p className="error spaced-below">{attachError}</p>}

      {attachments.length === 0 ? (
        <p className="muted">No policies attached to this organizational unit.</p>
      ) : (
        <table className="policy-table">
          <thead>
            <tr>
              <th>Policy ID</th>
              <th>Name</th>
              <th>Enforced</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {attachments.map((a) => (
              <tr key={a.policyId}>
                <td className="kv-mono">{truncateUUID(a.policy.policyId)}</td>
                <td>{a.policy.name || a.policyId}</td>
                <td>{a.enforced ? 'Yes' : 'No'}</td>
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
