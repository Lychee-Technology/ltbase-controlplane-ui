import { useState } from 'react';
import type { AuthOrgUnit } from './organizationData';

export interface OrgUnitCreateValue {
  ouId: string;
  name: string;
  parentOuId: string;
  blockInheritance: boolean;
}

export interface OrgUnitUpdateValue {
  name: string;
  parentOuId: string;
  blockInheritance: boolean;
}

interface BaseProps {
  allUnits: AuthOrgUnit[];
  parentOptions: AuthOrgUnit[];
  saving: boolean;
  onCancel: () => void;
}

interface CreateProps extends BaseProps {
  mode: 'create';
  onSave: (value: OrgUnitCreateValue) => void;
}

interface EditProps extends BaseProps {
  mode: 'edit';
  unit: AuthOrgUnit;
  onSave: (value: OrgUnitUpdateValue) => void;
}

type Props = CreateProps | EditProps;

export function OrganizationUnitForm(props: Props) {
  const { mode, allUnits, parentOptions, saving, onSave, onCancel } = props;
  const [ouId, setOuId] = useState(mode === 'create' ? '' : props.unit.ouId);
  const [name, setName] = useState(mode === 'create' ? '' : props.unit.name);
  const [parentOuId, setParentOuId] = useState(mode === 'create' ? '' : props.unit.parentOuId);
  const [blockInheritance, setBlockInheritance] = useState(mode === 'create' ? false : props.unit.blockInheritance);

  function handleSubmit() {
    if (mode === 'create') {
      onSave({ ouId, name, parentOuId, blockInheritance });
    } else {
      onSave({ name, parentOuId, blockInheritance });
    }
  }

  const title = mode === 'create' ? 'Create Organizational Unit' : `Edit ${props.unit.name || props.unit.ouId}`;
  const canSave = mode === 'edit' || ouId.trim();

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Organization</p>
          <h2>{title}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={handleSubmit} disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="form-fields">
        {mode === 'edit' && props.unit.ouPath && (
          <div className="user-readonly-fields">
            <label className="form-field">
              <span className="form-label">OU Path</span>
              <input className="form-input" type="text" value={props.unit.ouPath} readOnly disabled />
            </label>
          </div>
        )}

        {mode === 'create' && (
          <label className="form-field" htmlFor="org-ou-id">
            <span className="form-label">OU ID</span>
            <input
              id="org-ou-id"
              className="form-input"
              type="text"
              value={ouId}
              onChange={(e) => setOuId(e.target.value)}
              placeholder="ou-sales"
              disabled={saving}
            />
          </label>
        )}

        <label className="form-field" htmlFor="org-ou-name">
          <span className="form-label">Name</span>
          <input
            id="org-ou-name"
            className="form-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sales"
            disabled={saving}
          />
        </label>

        <label className="form-field" htmlFor="org-ou-parent">
          <span className="form-label">Parent OU</span>
          <select
            id="org-ou-parent"
            className="form-input"
            value={parentOuId}
            onChange={(e) => setParentOuId(e.target.value)}
            disabled={saving}
          >
            <option value="">No parent (root)</option>
            {parentOptions.map((unit) => (
              <option key={unit.ouId} value={unit.ouId}>
                {unit.name !== unit.ouId ? `${unit.name} (${unit.ouId})` : unit.ouId}
              </option>
            ))}
          </select>
        </label>

        <label className="org-toggle-label">
          <input
            type="checkbox"
            checked={blockInheritance}
            onChange={(e) => setBlockInheritance(e.target.checked)}
            disabled={saving}
          />
          Block policy inheritance
        </label>
      </div>
    </section>
  );
}
