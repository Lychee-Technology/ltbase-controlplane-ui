import { Activity, Database, KeyRound, LayoutDashboard, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadRuntimeConfig } from './config';
import { createControlPlaneClient } from './api/controlPlaneClient';
import { exchangeExternalToken, refreshSession } from './auth/auth';
import { createFirebaseAuthProvider } from './auth/firebaseAuth';
import { createSupabaseAuthProvider } from './auth/supabaseAuth';
import {
  clearPendingLogin,
  clearSession,
  loadPendingLogin,
  loadSession,
  savePendingLogin,
  saveSession,
} from './auth/session';
import { saveDraft } from './drafts/drafts';
import { OverviewDashboard } from './overview/OverviewDashboard';
import { LocalSchemaEditor } from './schema/LocalSchemaEditor';
import { SchemaWorkspace } from './schemas/SchemaWorkspace';
import { WorkflowWorkspace } from './workflows/WorkflowWorkspace';
import { PolicyWorkspace } from './policies/PolicyWorkspace';
import { RoleWorkspace } from './roles/RoleWorkspace';
import { UserWorkspace } from './users/UserWorkspace';
import { ReferralWorkspace } from './referrals/ReferralWorkspace';
import { BindingPolicyWorkspace } from './bindingPolicies/BindingPolicyWorkspace';
import type {
  AuthProviderConfig,
  RuntimeConfig,
  SessionState,
  StackConfig,
  WorkspaceKey,
} from './types';
import { formatControlPlaneError } from './types';
import './styles.css';

const workspaces: Array<{ key: WorkspaceKey; label: string; icon: ReactNode }> = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { key: 'users', label: 'Users', icon: <UsersRound size={18} /> },
  { key: 'roles', label: 'Roles', icon: <KeyRound size={18} /> },
  { key: 'policies', label: 'Policies', icon: <Database size={18} /> },
  { key: 'organization', label: 'Organization', icon: <Database size={18} /> },
  { key: 'model', label: 'Model & Capabilities', icon: <Database size={18} /> },
  { key: 'workflow', label: 'Workflow Authoring', icon: <Database size={18} /> },
  { key: 'security', label: 'Security & Compliance', icon: <KeyRound size={18} /> },
  { key: 'health', label: 'Deployment Health', icon: <Activity size={18} /> },
  { key: 'referrals', label: 'Referrals', icon: <UsersRound size={18} /> },
  { key: 'bindingPolicies', label: 'Binding Policies', icon: <Database size={18} /> },
];

const refreshingRestoredSessions = new Map<string, string>();

export default function App() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [selectedStackKey, setSelectedStackKey] = useState('');
  const [workspace, setWorkspace] = useState<WorkspaceKey>('overview');
  const [session, setSession] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<string>('Loading runtime config...');
  const selectedStackKeyRef = useRef(selectedStackKey);
  const activeProviderByStackRef = useRef<Record<string, AuthProviderConfig>>({});
  const sessionInteractionRef = useRef(0);
  const skippedInitialRefreshByStackRef = useRef<Record<string, string>>({});

  selectedStackKeyRef.current = selectedStackKey;

  useEffect(() => {
    loadRuntimeConfig()
      .then((loaded) => {
        setConfig(loaded);
        setSelectedStackKey(loaded.stacks[0]?.key ?? '');
        setStatus('Runtime config loaded');
      })
      .catch((error: unknown) => {
        setStatus(formatControlPlaneError(error));
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

  useEffect(() => {
    if (!selectedStack) {
      sessionInteractionRef.current += 1;
      setSession(null);
      return;
    }

    const interactionId = ++sessionInteractionRef.current;
    setSession(null);

    const restoredSession = loadSession(window.sessionStorage, selectedStack.key);
    if (restoredSession?.providerName) {
      const providerConfig = selectedStack.authProviders.find((provider) => provider.name === restoredSession.providerName);
      if (providerConfig) {
        activeProviderByStackRef.current[selectedStack.key] = providerConfig;
      }
    }

    if (!restoredSession) {
      setSession(null);
      return;
    }

    setSession(restoredSession);
    if (!restoredSession.refreshToken) {
      return;
    }

    const skippedInitialRefreshToken = skippedInitialRefreshByStackRef.current[selectedStack.key];
    if (skippedInitialRefreshToken === restoredSession.refreshToken) {
      delete skippedInitialRefreshByStackRef.current[selectedStack.key];
      return;
    }

    const refreshMarker = refreshingRestoredSessions.get(selectedStack.key);
    if (refreshMarker === restoredSession.refreshToken) {
      return;
    }
    refreshingRestoredSessions.set(selectedStack.key, restoredSession.refreshToken);

    void refreshSession(selectedStack, restoredSession.refreshToken)
      .then((nextSession) => {
        if (selectedStackKeyRef.current !== selectedStack.key || sessionInteractionRef.current !== interactionId) {
          return;
        }
        const persistedSession = {
          ...nextSession,
          providerName: restoredSession.providerName,
          subject: restoredSession.subject,
        } satisfies SessionState;
        saveSession(window.sessionStorage, selectedStack.key, persistedSession);
        setSession(persistedSession);
      })
      .catch((error: unknown) => {
        if (selectedStackKeyRef.current !== selectedStack.key || sessionInteractionRef.current !== interactionId) {
          return;
        }
        clearSession(window.sessionStorage, selectedStack.key);
        clearPendingLogin(window.sessionStorage, selectedStack.key);
        delete activeProviderByStackRef.current[selectedStack.key];
        setSession(null);
        setStatus(formatControlPlaneError(error));
      })
      .finally(() => {
        if (refreshingRestoredSessions.get(selectedStack.key) === restoredSession.refreshToken) {
          refreshingRestoredSessions.delete(selectedStack.key);
        }
      });
  }, [selectedStack]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const pendingStack = config.stacks.find((stack) => {
      const pendingLogin = loadPendingLogin(window.sessionStorage, stack.key);
      return pendingLogin && isCallbackUrl(stack.redirectUri);
    });
    if (!pendingStack) {
      return;
    }

    const pendingLogin = loadPendingLogin(window.sessionStorage, pendingStack.key);
    if (!pendingLogin) {
      return;
    }

    const providerConfig = pendingStack.authProviders.find(
        (provider) => provider.type === pendingLogin.providerType && provider.name === pendingLogin.providerName,
      );
    if (!providerConfig || providerConfig.type !== 'supabase') {
      clearPendingLogin(window.sessionStorage, pendingStack.key);
      return;
    }

    selectedStackKeyRef.current = pendingStack.key;
    setSelectedStackKey(pendingStack.key);
    void loginWithProvider(pendingStack, providerConfig, { allowRedirect: false });
  }, [config]);

  async function loginWithProvider(
    stack: StackConfig,
    providerConfig: AuthProviderConfig,
    options?: { allowRedirect?: boolean },
  ): Promise<void> {
    const interactionId = ++sessionInteractionRef.current;
    try {
      setStatus(`Signing in with ${providerConfig.label}...`);
      if (providerConfig.type === 'supabase') {
        savePendingLogin(window.sessionStorage, stack.key, {
          providerName: providerConfig.name,
          providerType: 'supabase',
        });
      }
      const provider = createExternalAuthProvider(stack, providerConfig);
      const result = await provider.signIn(options);
      if (result.type === 'redirect') {
        if (options?.allowRedirect === false) {
          clearPendingLogin(window.sessionStorage, stack.key);
          setStatus('Supabase sign-in did not complete');
          return;
        }
        setStatus(`Continuing ${providerConfig.label} sign-in...`);
        return;
      }
      if (result.type === 'unavailable') {
        clearPendingLogin(window.sessionStorage, stack.key);
        setStatus('Supabase sign-in did not complete');
        return;
      }

      const nextSession = await exchangeExternalToken(stack, providerConfig.name, result.externalToken);
      const persistedSession = {
        ...nextSession,
        providerName: providerConfig.name,
        subject: result.subjectLabel,
      } satisfies SessionState;
      activeProviderByStackRef.current[stack.key] = providerConfig;
      saveSession(window.sessionStorage, stack.key, persistedSession);
      if (persistedSession.refreshToken) {
        skippedInitialRefreshByStackRef.current[stack.key] = persistedSession.refreshToken;
      } else {
        delete skippedInitialRefreshByStackRef.current[stack.key];
      }
      clearPendingLogin(window.sessionStorage, stack.key);
      if (selectedStackKeyRef.current !== stack.key || sessionInteractionRef.current !== interactionId) {
        return;
      }
      setSession(persistedSession);
      setStatus(`Connected to LTBase as ${persistedSession.subject ?? providerConfig.label}`);
    } catch (error: unknown) {
      if (providerConfig.type === 'supabase') {
        clearPendingLogin(window.sessionStorage, stack.key);
      }
      if (selectedStackKeyRef.current !== stack.key || sessionInteractionRef.current !== interactionId) {
        return;
      }
      setStatus(formatControlPlaneError(error));
    }
  }

  async function logoutCurrentStack(): Promise<void> {
    if (!selectedStack) {
      return;
    }

    sessionInteractionRef.current += 1;
    const providerConfig = activeProviderByStackRef.current[selectedStack.key];
    try {
      if (providerConfig) {
        await createExternalAuthProvider(selectedStack, providerConfig).signOut();
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : 'Logout failed');
      return;
    }

    clearSession(window.sessionStorage, selectedStack.key);
    delete skippedInitialRefreshByStackRef.current[selectedStack.key];
    refreshingRestoredSessions.delete(selectedStack.key);
    clearPendingLogin(window.sessionStorage, selectedStack.key);
    delete activeProviderByStackRef.current[selectedStack.key];
    setSession(null);
    setStatus('Signed out of LTBase');
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
            {selectedStack && !session &&
              selectedStack.authProviders.map((provider) => (
                <button
                  key={provider.name}
                  className="button ghost"
                  type="button"
                  onClick={() => void loginWithProvider(selectedStack, provider)}
                >
                  Login with {provider.label}
                </button>
              ))}
            {session && (
              <button className="button ghost" type="button" onClick={() => void logoutCurrentStack()}>
                Logout
              </button>
            )}
            <button className="button primary" type="button" onClick={saveLocalDraft} disabled={!selectedStack}>
              Save local draft
            </button>
          </div>
        </header>

        <p className="status">{status}</p>
        {workspace === 'overview' && <OverviewDashboard client={client} onNavigate={setWorkspace} />}
        {workspace === 'users' && <UserWorkspace client={client} />}
        {workspace === 'roles' && <RoleWorkspace client={client} />}
        {workspace === 'policies' && <PolicyWorkspace client={client} />}
        {workspace === 'organization' && <Placeholder title="Organization Management" description="#32 — Manage the OU tree, OU policy attachments, and user placement." />}
        {workspace === 'model' && <ModelWorkspace clientReady={client !== null} />}
        {workspace === 'workflow' && <WorkflowWorkspace clientReady={client !== null} />}
        {workspace === 'security' && <Placeholder title="Security policy editor" description="Roles, policies, bindings, capability assignments, and compliance profile will use the shared draft/apply model." />}
        {workspace === 'health' && <Placeholder title="Deployment health" description="Status, schema drift, dry-run repair, and confirmed repair operations will be shown here." />}
        {workspace === 'referrals' && <ReferralWorkspace client={client} />}
        {workspace === 'bindingPolicies' && <BindingPolicyWorkspace client={client} />}
      </section>
    </main>
  );
}

function createExternalAuthProvider(stack: StackConfig, config: AuthProviderConfig) {
  if (config.type === 'firebase') {
    return createFirebaseAuthProvider(config);
  }

  return createSupabaseAuthProvider(config, stack.redirectUri);
}

function isCallbackUrl(redirectUri: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const callbackUrl = new URL(redirectUri);
    const currentUrl = new URL(window.location.href);
    return callbackUrl.origin === currentUrl.origin && callbackUrl.pathname === currentUrl.pathname;
  } catch {
    return false;
  }
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
      <SchemaWorkspace clientReady={clientReady} />
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
