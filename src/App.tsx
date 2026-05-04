import { Activity, Database, KeyRound, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadRuntimeConfig } from './config';
import { createControlPlaneClient } from './api/controlPlaneClient';
import { saveDraft } from './drafts/drafts';
import { buildLoginURL } from './auth/auth';
import { LocalSchemaEditor } from './schema/LocalSchemaEditor';
import type { RuntimeConfig, SessionState, StackConfig, WorkspaceKey } from './types';
import './styles.css';

const workspaces: Array<{ key: WorkspaceKey; label: string; icon: ReactNode }> = [
  { key: 'model', label: 'Model & Capabilities', icon: <Database size={18} /> },
  { key: 'security', label: 'Security & Compliance', icon: <KeyRound size={18} /> },
  { key: 'health', label: 'Deployment Health', icon: <Activity size={18} /> },
  { key: 'referrals', label: 'Referrals', icon: <UsersRound size={18} /> },
];

export default function App() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [selectedStackKey, setSelectedStackKey] = useState('');
  const [workspace, setWorkspace] = useState<WorkspaceKey>('model');
  const [session, setSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<string>('Loading runtime config...');

  useEffect(() => {
    loadRuntimeConfig()
      .then((loaded) => {
        setConfig(loaded);
        setSelectedStackKey(loaded.stacks[0]?.key ?? '');
        setStatus('Runtime config loaded');
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'Failed to load runtime config');
      });
  }, []);

  const selectedStack = useMemo(
    () => config?.stacks.find((stack) => stack.key === selectedStackKey) ?? null,
    [config, selectedStackKey],
  );

  const client = useMemo(
    () => (selectedStack && session ? createControlPlaneClient(selectedStack, session.accessToken) : null),
    [selectedStack, session],
  );

  function simulateAdminSession(): void {
    setSession({ accessToken: 'local-dev-admin-token', subject: 'local-dev-admin' });
  }

  function saveLocalDraft(): void {
    if (!selectedStack) return;
    saveDraft(window.localStorage, {
      userKey: session?.subject ?? 'anonymous',
      stackKey: selectedStack.key,
      resourceType: workspace,
      value: { workspace, savedAt: new Date().toISOString() },
    });
    setStatus(`Saved local ${workspace} draft for ${selectedStack.label}`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">LT</span>
          <div>
            <strong>LTBase</strong>
            <span>Control Plane</span>
          </div>
        </div>
        <nav>
          {workspaces.map((item) => (
            <button
              key={item.key}
              className={item.key === workspace ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => setWorkspace(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Configuration Workbench</p>
            <h1>{workspaces.find((item) => item.key === workspace)?.label}</h1>
          </div>
          <div className="topbar-controls">
            <StackSelector config={config} selectedStackKey={selectedStackKey} onChange={setSelectedStackKey} />
            {selectedStack && !session && (
              <a className="button ghost" href={buildLoginURL(selectedStack, crypto.randomUUID())}>
                Login
              </a>
            )}
            {!session && (
              <button className="button ghost" type="button" onClick={simulateAdminSession}>
                Local token
              </button>
            )}
            <button className="button primary" type="button" onClick={saveLocalDraft} disabled={!selectedStack}>
              Save local draft
            </button>
          </div>
        </header>

        <p className="status">{status}</p>
        {workspace === 'model' && <ModelWorkspace clientReady={client !== null} />}
        {workspace === 'security' && <Placeholder title="Security policy editor" description="Roles, policies, bindings, capability assignments, and compliance profile will use the shared draft/apply model." />}
        {workspace === 'health' && <Placeholder title="Deployment health" description="Status, schema drift, dry-run repair, and confirmed repair operations will be shown here." />}
        {workspace === 'referrals' && <Placeholder title="Referral management" description="Create, import, search, update, disable, and safely delete referral codes from this workspace." />}
      </section>
    </main>
  );
}

function StackSelector(props: {
  config: RuntimeConfig | null;
  selectedStackKey: string;
  onChange: (stackKey: string) => void;
}) {
  if (!props.config) {
    return <span className="select-placeholder">No stack config</span>;
  }
  return (
    <select value={props.selectedStackKey} onChange={(event) => props.onChange(event.target.value)}>
      {props.config.stacks.map((stack: StackConfig) => (
        <option key={stack.key} value={stack.key}>
          {stack.label}
        </option>
      ))}
    </select>
  );
}

function ModelWorkspace({ clientReady }: { clientReady: boolean }) {
  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Schema status</p>
            <h2>Published vs applied</h2>
          </div>
        </div>
        <p className="muted">
          The UI reads schema status from Control Plane. Schema files remain deployment-repo assets.
        </p>
        <span className={clientReady ? 'pill ready' : 'pill'}>{clientReady ? 'API client ready' : 'Login required'}</span>
      </section>
      <LocalSchemaEditor />
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">V1 workspace</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="muted">{description}</p>
    </section>
  );
}
