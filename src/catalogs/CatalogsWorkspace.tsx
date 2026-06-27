import { useCallback, useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError } from '../types';
import {
  BUILT_IN_ROLES,
  CATALOG_TABS,
  extractCatalogData,
  validateCatalogJSON,
  type CatalogKind,
} from './catalogData';
import './catalogs.css';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; json: string };

export function CatalogsWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [activeTab, setActiveTab] = useState<CatalogKind>('capabilities');
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [editorText, setEditorText] = useState('');
  const [clientError, setClientError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!client) {
      setState({ kind: 'idle' });
      return;
    }
    setState({ kind: 'loading' });
    setClientError('');
    setSaved(false);
    try {
      let payload: unknown;
      switch (activeTab) {
        case 'capabilities':
          payload = await client.getCapabilityCatalog();
          break;
        case 'actionTemplates':
          payload = await client.getActionTemplateCatalog();
          break;
        case 'assistantRoles':
          payload = await client.getAssistantRoleCatalog();
          break;
        case 'complianceProfile':
          payload = await client.getComplianceProfile();
          break;
      }
      const json = extractCatalogData(payload);
      setEditorText(json || '');
      setState({ kind: 'ready', json: json || '' });
    } catch (error: unknown) {
      setState({ kind: 'error', message: formatControlPlaneError(error) });
    }
  }, [client, activeTab]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (state.kind === 'ready') {
      setEditorText(state.json);
    }
  }, [activeTab, state.kind]);

  function handleEditorChange(value: string) {
    setEditorText(value);
    setClientError('');
    setSaved(false);
  }

  async function handleSave() {
    if (!client) {
      return;
    }
    const validation = validateCatalogJSON(editorText);
    if (!validation.valid) {
      setClientError(validation.message);
      return;
    }
    const data = validation.parsed;
    setSaving(true);
    setClientError('');
    setSaved(false);
    try {
      let result: unknown;
      switch (activeTab) {
        case 'capabilities':
          result = await client.putCapabilityCatalog(data);
          break;
        case 'actionTemplates':
          result = await client.putActionTemplateCatalog(data);
          break;
        case 'assistantRoles':
          result = await client.putAssistantRoleCatalog(data);
          break;
        case 'complianceProfile':
          result = await client.putComplianceProfile(data);
          break;
      }
      const returnedJSON = extractCatalogData(result);
      setEditorText(returnedJSON);
      setState({ kind: 'ready', json: returnedJSON });
      setSaved(true);
    } catch (error: unknown) {
      setClientError(formatServerError(error));
    } finally {
      setSaving(false);
    }
  }

  function formatServerError(error: unknown): string {
    const msg = formatControlPlaneError(error);
    const obj = error as Record<string, unknown> | null;
    if (obj?.details) {
      try {
        const detailsJSON = JSON.stringify(obj.details, null, 2);
        return `${msg}\nDetails: ${detailsJSON}`;
      } catch {
        return msg;
      }
    }
    return msg;
  }

  const activeTabDef = CATALOG_TABS.find((t) => t.kind === activeTab);
  const submitDisabled = saving;

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2>Catalogs & Compliance</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to manage catalogs and compliance.</p>
      </section>
    );
  }

  return (
    <div className="catalogs-layout">
      <section className="panel catalogs-main">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2>Catalogs & Compliance</h2>
          </div>
          <div className="actions">
            <button
              className="button primary"
              type="button"
              onClick={() => void handleSave()}
              disabled={submitDisabled}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="catalog-tabs">
          {CATALOG_TABS.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              className={tab.kind === activeTab ? 'catalog-tab active' : 'catalog-tab'}
              onClick={() => setActiveTab(tab.kind)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {state.kind === 'loading' && <p className="muted">Loading {activeTabDef?.label.toLowerCase()}…</p>}

        {state.kind === 'error' && (
          <div>
            <p className="error">{state.message}</p>
            <button className="button ghost spaced-above" type="button" onClick={() => void loadCatalog()}>
              Retry
            </button>
          </div>
        )}

        {state.kind === 'ready' && (
          <div>
            <p className="catalog-desc">{getCatalogDescription(activeTab)}</p>
            <textarea
              className="schema-textarea"
              value={editorText}
              onChange={(e) => handleEditorChange(e.target.value)}
              spellCheck={false}
              aria-label={`${activeTabDef?.label} JSON`}
              disabled={saving}
            />
            {clientError && <pre className="catalog-error">{clientError}</pre>}
            {saved && <p className="catalog-saved">Saved successfully.</p>}
          </div>
        )}
      </section>

      <aside className="catalogs-sidebar">
        {activeTab === 'assistantRoles' && <AssistantRoleReference />}
        {activeTab === 'complianceProfile' && <ComplianceProfileNote />}
      </aside>
    </div>
  );
}

function getCatalogDescription(kind: CatalogKind): string {
  switch (kind) {
    case 'capabilities':
      return 'Define named capabilities with entity references and policy match rules. Capabilities are validated against known entity schemas.';
    case 'actionTemplates':
      return 'Define action templates with target entities, required inputs, tool candidates, and semantic contracts. Templates are validated against the schema registry.';
    case 'assistantRoles':
      return 'Configure custom AI assistant roles with system prompts. Roles use status active/inactive. Resolution order: project custom → built-in → default general.';
    case 'complianceProfile':
      return 'Configure compliance controls with modes (off/warn/block) and optional selectors. Server default baseline is shown when project profile is empty.';
  }
}

function AssistantRoleReference() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>Built-in Roles</h2>
        </div>
      </div>
      <p className="muted">
        Custom project roles take priority. If a role is missing or inactive, the resolver falls back to the built-in
        definition, then to the default <code>general</code> role.
      </p>
      <p className="muted">Role resolution order: project custom → built-in → default general</p>
      {BUILT_IN_ROLES.map((role) => (
        <div key={role.role} className="builtin-role-card">
          <strong className="builtin-role-name">{role.role}</strong>
          <p className="muted">{role.description}</p>
          <p className="muted builtin-role-instruction">{role.instruction}</p>
        </div>
      ))}
      <div className="spaced-above">
        <p className="form-label">Role object format</p>
        <p className="kv-mono">{'{"role":"<key>","system_prompt":"<prompt>","status":"active|inactive"}'}</p>
      </div>
    </section>
  );
}

function ComplianceProfileNote() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>About Compliance Profile</h2>
        </div>
      </div>
      <p className="muted">
        When the project compliance profile is empty or has no controls, the server returns a default baseline with
        these controls set to <code>warn</code> or <code>block</code>.
      </p>
      <p className="muted">Supported control modes: <code>off</code>, <code>warn</code>, <code>block</code>.</p>
      <p className="muted">
        Optional selectors can scope a control to specific entities, capabilities, policies, or actions.
      </p>
    </section>
  );
}
