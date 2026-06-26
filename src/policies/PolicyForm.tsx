import { useEffect, useState } from 'react';
import { validatePolicyDocumentJSON, defaultPolicyDocumentJSON, formatPolicyDocument } from './policyData';
import type { AuthPolicy, PolicyFormValue } from './policyData';

interface Props {
  mode: 'create' | 'edit';
  policy?: AuthPolicy;
  saving: boolean;
  onSave: (value: PolicyFormValue) => void;
  onCancel: () => void;
}

function PolicyForm({ mode, policy, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(policy?.name ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [documentJSON, setDocumentJSON] = useState(() =>
    mode === 'edit' && policy ? formatPolicyDocument(policy.document) : defaultPolicyDocumentJSON(),
  );
  const [docError, setDocError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && policy) {
      setName(policy.name);
      setDescription(policy.description);
      setDocumentJSON(formatPolicyDocument(policy.document));
    }
    if (mode === 'create') {
      setName('');
      setDescription('');
      setDocumentJSON(defaultPolicyDocumentJSON());
    }
  }, [mode, policy]);

  function handleDocumentChange(value: string) {
    setDocumentJSON(value);
    const validation = validatePolicyDocumentJSON(value);
    if (!validation.valid) {
      setDocError(validation.message);
    } else {
      setDocError('');
    }
  }

  function handleSubmit() {
    const validation = validatePolicyDocumentJSON(documentJSON);
    if (!validation.valid) {
      setDocError(validation.message);
      return;
    }
    if (!name.trim()) {
      return;
    }
    onSave({ name: name.trim(), description: description.trim(), policyDocument: validation.parsed });
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{mode === 'create' ? 'New Policy' : 'Edit Policy'}</p>
          <h2>{mode === 'create' ? 'Create Policy' : policy?.name ?? 'Edit'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={saving || !!docError || !name.trim()}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <div className="form-fields">
        <label className="form-field">
          <span className="form-label">Name</span>
          <input
            className="form-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Read Policy"
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
            placeholder="What this policy allows or denies"
            disabled={saving}
          />
        </label>

        <label className="form-field">
          <span className="form-label">Policy Document (JSON)</span>
          <textarea
            className="schema-textarea"
            value={documentJSON}
            onChange={(e) => handleDocumentChange(e.target.value)}
            spellCheck={false}
            aria-label="Policy document JSON"
            disabled={saving}
          />
          {docError && <p className="error" style={{ marginTop: 4 }}>Invalid JSON: {docError}</p>}
        </label>
      </div>
    </section>
  );
}

export { PolicyForm };
