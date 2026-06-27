import { useEffect, useState } from 'react';
import {
  validateBindingRulesJSON,
  defaultBindingRulesJSON,
  formatBindingRules,
} from './bindingPolicyData';
import type { AuthBindingPolicy, BindingPolicyFormValue } from './bindingPolicyData';

interface Props {
  mode: 'create' | 'edit';
  policy?: AuthBindingPolicy;
  saving: boolean;
  onSave: (value: BindingPolicyFormValue) => void;
  onCancel: () => void;
}

export function BindingPolicyForm({ mode, policy, saving, onSave, onCancel }: Props) {
  const [enabled, setEnabled] = useState(policy?.enabled ?? true);
  const [priority, setPriority] = useState(policy?.priority ?? 0);
  const [rulesJSON, setRulesJSON] = useState(() =>
    mode === 'edit' && policy ? formatBindingRules(policy.rules) : defaultBindingRulesJSON(),
  );
  const [rulesError, setRulesError] = useState('');
  const [priorityError, setPriorityError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && policy) {
      setEnabled(policy.enabled);
      setPriority(policy.priority);
      setRulesJSON(formatBindingRules(policy.rules));
    }
    if (mode === 'create') {
      setEnabled(true);
      setPriority(0);
      setRulesJSON(defaultBindingRulesJSON());
    }
  }, [mode, policy]);

  function handleRulesChange(value: string) {
    setRulesJSON(value);
    const validation = validateBindingRulesJSON(value);
    if (!validation.valid) {
      setRulesError(validation.message);
    } else {
      setRulesError('');
    }
  }

  function handlePriorityChange(value: string) {
    setPriorityError('');
    const trimmed = value.trim();
    if (trimmed === '') {
      setPriority(0);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setPriorityError('Priority must be a non-negative integer');
      setPriority(0);
    } else {
      setPriority(parsed);
    }
  }

  function handleSubmit() {
    const validation = validateBindingRulesJSON(rulesJSON);
    if (!validation.valid) {
      setRulesError(validation.message);
      return;
    }
    if (priorityError) {
      return;
    }
    onSave({ enabled, priority, rules: validation.parsed });
  }

  const submitDisabled = saving || !!rulesError || !!priorityError;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{mode === 'create' ? 'New Binding Policy' : 'Edit Binding Policy'}</p>
          <h2>{mode === 'create' ? 'Create Binding Policy' : policy?.slug || policy?.policyId || 'Edit'}</h2>
        </div>
        <div className="actions">
          <button className="button ghost" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {mode === 'edit' && policy && (
        <dl className="kv-list">
          <dt>Policy ID</dt>
          <dd className="kv-mono">{policy.policyId || '—'}</dd>
          <dt>Slug</dt>
          <dd className="kv-mono">{policy.slug || '—'}</dd>
          <dt>External Key</dt>
          <dd className="kv-mono">{policy.externalKey || '—'}</dd>
        </dl>
      )}

      <div className="form-fields">
        <label className="form-field">
          <span className="form-label">Enabled</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={saving}
          />
        </label>

        <label className="form-field">
          <span className="form-label">Priority</span>
          <input
            className="form-input"
            type="text"
            inputMode="numeric"
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            placeholder="0"
            disabled={saving}
          />
          {priorityError && <p className="error form-hint">{priorityError}</p>}
        </label>

        <label className="form-field">
          <span className="form-label">Rules (JSON)</span>
          <textarea
            className="schema-textarea"
            value={rulesJSON}
            onChange={(e) => handleRulesChange(e.target.value)}
            spellCheck={false}
            aria-label="Binding policy rules JSON"
            disabled={saving}
          />
          {rulesError && <p className="error form-hint">Invalid JSON: {rulesError}</p>}
        </label>
      </div>
    </section>
  );
}
