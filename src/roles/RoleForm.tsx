import { useEffect, useMemo, useState } from 'react';
import type { AuthRole, RoleFormValue } from './roleData';
import { truncateUUID } from './roleData';

interface Props {
  mode: 'create' | 'edit';
  role?: AuthRole;
  allRoles: AuthRole[];
  saving: boolean;
  onSave: (value: RoleFormValue) => void;
  onCancel: () => void;
}

export function RoleForm({ mode, role, allRoles, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>(role?.parentRoleIds ?? []);
  const [parentSearch, setParentSearch] = useState('');

  useEffect(() => {
    if (mode === 'edit' && role) {
      setName(role.name);
      setDescription(role.description);
      setSelectedParentIds(role.parentRoleIds);
    }
    if (mode === 'create') {
      setName('');
      setDescription('');
      setSelectedParentIds([]);
    }
  }, [mode, role]);

  const parentCandidates = useMemo(() => {
    const searchLower = parentSearch.toLowerCase().trim();
    const excludeId = mode === 'edit' ? role?.roleId : undefined;
    return allRoles.filter((r) => {
      if (excludeId && r.roleId === excludeId) {
        return false;
      }
      if (!searchLower) {
        return true;
      }
      return (
        r.name.toLowerCase().includes(searchLower) ||
        r.slug.toLowerCase().includes(searchLower) ||
        r.roleId.toLowerCase().includes(searchLower)
      );
    });
  }, [allRoles, parentSearch, mode, role?.roleId]);

  function toggleParent(id: string) {
    setSelectedParentIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    if (!name.trim()) {
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      parentRoleIds: selectedParentIds,
    });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{mode === 'create' ? 'New Role' : 'Edit Role'}</p>
          <h2>{mode === 'create' ? 'Create Role' : role?.name ?? 'Edit'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div className="form-fields">
        {mode === 'edit' && role && (
          <div className="role-readonly-fields">
            <label className="form-field">
              <span className="form-label">Role ID</span>
              <input className="form-input" type="text" value={role.roleId} readOnly disabled />
            </label>
            <label className="form-field">
              <span className="form-label">Slug</span>
              <input className="form-input" type="text" value={role.slug || '—'} readOnly disabled />
            </label>
            <label className="form-field">
              <span className="form-label">External Key</span>
              <input className="form-input" type="text" value={role.externalKey || '—'} readOnly disabled />
            </label>
          </div>
        )}

        <label className="form-field">
          <span className="form-label">Name</span>
          <input
            className="form-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Administrator"
            disabled={saving}
          />
        </label>

        <label className="form-field">
          <span className="form-label">Description</span>
          <input
            className="form-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is for"
            disabled={saving}
          />
        </label>

        <fieldset className="form-field" disabled={saving}>
          <legend className="form-label">Parent Roles</legend>
          <input
            className="form-input"
            type="text"
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            placeholder="Search by name, slug, or ID…"
            disabled={saving}
          />
          <div className="parent-role-list">
            {parentCandidates.length === 0 ? (
              <p className="muted">{parentSearch ? 'No matching roles' : 'No roles available'}</p>
            ) : (
              parentCandidates.map((r) => (
                <label key={r.roleId} className="parent-role-item">
                  <input
                    type="checkbox"
                    checked={selectedParentIds.includes(r.roleId)}
                    onChange={() => toggleParent(r.roleId)}
                    disabled={saving}
                  />
                  <span className="parent-role-label">
                    <strong>{r.name || 'Unnamed'}</strong>
                    <span className="parent-role-meta">
                      {r.slug && <span className="kv-mono">{r.slug}</span>}
                      <span className="kv-mono muted">{truncateUUID(r.roleId)}</span>
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
