import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { RuntimeConfig } from './types';

const mocks = vi.hoisted(() => ({
  loadRuntimeConfig: vi.fn(),
  exchangeExternalToken: vi.fn(),
  refreshSession: vi.fn(),
  firebaseSignIn: vi.fn(),
  firebaseSignOut: vi.fn(),
  supabaseSignIn: vi.fn(),
  supabaseSignOut: vi.fn(),
}));

vi.mock('./config', () => ({
  loadRuntimeConfig: mocks.loadRuntimeConfig,
}));

vi.mock('./auth/auth', () => ({
  exchangeExternalToken: mocks.exchangeExternalToken,
  refreshSession: mocks.refreshSession,
}));

vi.mock('./auth/firebaseAuth', () => ({
  createFirebaseAuthProvider: vi.fn(() => ({
    signIn: mocks.firebaseSignIn,
    signOut: mocks.firebaseSignOut,
  })),
}));

vi.mock('./auth/supabaseAuth', () => ({
  createSupabaseAuthProvider: vi.fn(() => ({
    signIn: mocks.supabaseSignIn,
    signOut: mocks.supabaseSignOut,
  })),
}));

vi.mock('./drafts/drafts', () => ({
  saveDraft: vi.fn(),
}));

vi.mock('./overview/OverviewDashboard', () => ({
  OverviewDashboard: ({ client, onNavigate }: { client: unknown; onNavigate: (key: string) => void }) => (
    <div>
      <span>Dashboard ready: {String(client !== null)}</span>
      <button type="button" onClick={() => onNavigate('users')}>Go to Users</button>
    </div>
  ),
}));

vi.mock('./schema/LocalSchemaEditor', () => ({
  LocalSchemaEditor: () => <div>Local Schema Editor</div>,
}));

vi.mock('./schemas/SchemaWorkspace', () => ({
  SchemaWorkspace: ({ clientReady }: { clientReady: boolean }) => <div>Schema workspace ready: {String(clientReady)}</div>,
}));

vi.mock('./workflows/WorkflowWorkspace', () => ({
  WorkflowWorkspace: ({ clientReady }: { clientReady: boolean }) => <div>Workflow workspace ready: {String(clientReady)}</div>,
}));

vi.mock('./policies/PolicyWorkspace', () => ({
  PolicyWorkspace: ({ client }: { client: unknown }) => <div>Policy workspace ready: {String(client !== null)}</div>,
}));

vi.mock('./roles/RoleWorkspace', () => ({
  RoleWorkspace: ({ client }: { client: unknown }) => <div>Role workspace ready: {String(client !== null)}</div>,
}));

vi.mock('./users/UserWorkspace', () => ({
  UserWorkspace: ({ client }: { client: unknown }) => <div>User workspace ready: {String(client !== null)}</div>,
}));

const runtimeConfig: RuntimeConfig = {
  stacks: [
    {
      key: 'prod',
      label: 'Production',
      projectId: 'project-prod',
      authBaseUrl: 'https://auth.example.com',
      controlPlaneBaseUrl: 'https://control.example.com',
      apiBaseUrl: 'https://api.example.com',
      oidcClientId: 'ltbase-controlplane-ui',
      redirectUri: 'https://admin.example.com/auth/callback',
      authProviders: [
        {
          type: 'firebase',
          name: 'primary',
          label: 'Primary Firebase',
          firebaseProjectId: 'prod',
          firebaseApiKey: 'firebase-api-key',
        },
        {
          type: 'supabase',
          name: 'backup',
          label: 'Backup Supabase',
          supabaseUrl: 'https://supabase.example.com',
          supabaseAnonKey: 'supabase-anon-key',
        },
      ],
    },
    {
      key: 'staging',
      label: 'Staging',
      projectId: 'project-staging',
      authBaseUrl: 'https://staging-auth.example.com',
      controlPlaneBaseUrl: 'https://staging-control.example.com',
      apiBaseUrl: 'https://staging-api.example.com',
      oidcClientId: 'ltbase-controlplane-ui',
      redirectUri: 'https://staging-admin.example.com/auth/callback',
      authProviders: [
        {
          type: 'firebase',
          name: 'partner',
          label: 'Partner Firebase',
          firebaseProjectId: 'staging',
          firebaseApiKey: 'firebase-api-key-staging',
        },
      ],
    },
  ],
};

describe('App', () => {
  beforeEach(() => {
    mocks.loadRuntimeConfig.mockReset();
    mocks.exchangeExternalToken.mockReset();
    mocks.refreshSession.mockReset();
    mocks.firebaseSignIn.mockReset();
    mocks.firebaseSignOut.mockReset();
    mocks.supabaseSignIn.mockReset();
    mocks.supabaseSignOut.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('shows stack-specific provider buttons for the selected stack', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Login with Primary Firebase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login with Backup Supabase' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login with Partner Firebase' })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'staging');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login with Partner Firebase' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Login with Primary Firebase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login with Backup Supabase' })).not.toBeInTheDocument();
  });

  it('exchanges a provider token for an LTBase session and persists the LTBase login state', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.firebaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'provider-jwt',
      subjectLabel: 'admin@example.com',
    });
    mocks.exchangeExternalToken.mockResolvedValue({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Login with Primary Firebase' }));

    await waitFor(() => {
      expect(mocks.exchangeExternalToken).toHaveBeenCalledWith(
        runtimeConfig.stacks[0],
        'primary',
        'provider-jwt',
      );
    });

    expect(await screen.findByText('Connected to LTBase as admin@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Login with Primary Firebase' })).not.toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem('ltbase-controlplane-session:prod') ?? 'null')).toEqual({
      accessToken: 'ltbase-access',
      providerName: 'primary',
      refreshToken: 'ltbase-refresh',
      subject: 'admin@example.com',
    });
  });

  it('does not attach an in-flight login session to a different stack after stack switch', async () => {
    let resolveExchange: ((value: { accessToken: string; refreshToken: string }) => void) | undefined;

    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.firebaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'provider-jwt',
      subjectLabel: 'admin@example.com',
    });
    mocks.exchangeExternalToken.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExchange = resolve;
        }),
    );

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Login with Primary Firebase' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'staging');

    resolveExchange?.({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });

    await waitFor(() => {
      expect(JSON.parse(window.sessionStorage.getItem('ltbase-controlplane-session:prod') ?? 'null')).toEqual({
        accessToken: 'ltbase-access',
        providerName: 'primary',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
      });
    });

    expect(window.sessionStorage.getItem('ltbase-controlplane-session:staging')).toBeNull();
    expect(screen.getByRole('button', { name: 'Login with Partner Firebase' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('logs out from the upstream provider before clearing LTBase session state', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.firebaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'provider-jwt',
      subjectLabel: 'admin@example.com',
    });
    mocks.exchangeExternalToken.mockResolvedValue({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Login with Primary Firebase' }));
    await screen.findByRole('button', { name: 'Logout' });

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mocks.firebaseSignOut).toHaveBeenCalledTimes(1);
    });
    expect(window.sessionStorage.getItem('ltbase-controlplane-session:prod')).toBeNull();
    expect(screen.getByRole('button', { name: 'Login with Primary Firebase' })).toBeInTheDocument();
  });

  it('restores provider identity from stored session data so logout after reload signs out upstream', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.refreshSession.mockResolvedValue({
      accessToken: 'ltbase-access-refreshed',
      refreshToken: 'ltbase-refresh-refreshed',
    });
    window.sessionStorage.setItem(
      'ltbase-controlplane-session:prod',
      JSON.stringify({
        accessToken: 'ltbase-access',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
        providerName: 'primary',
      }),
    );

    render(<App />);

    await screen.findByRole('button', { name: 'Logout' });
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mocks.refreshSession).toHaveBeenCalledWith(runtimeConfig.stacks[0], 'ltbase-refresh');
      expect(mocks.firebaseSignOut).toHaveBeenCalledTimes(1);
    });
    expect(window.sessionStorage.getItem('ltbase-controlplane-session:prod')).toBeNull();
  });

  it('refreshes a restored LTBase session before reusing it', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.refreshSession.mockResolvedValue({
      accessToken: 'ltbase-access-refreshed',
      refreshToken: 'ltbase-refresh-refreshed',
    });
    window.sessionStorage.setItem(
      'ltbase-controlplane-session:prod',
      JSON.stringify({
        accessToken: 'ltbase-access-stale',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
        providerName: 'primary',
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(mocks.refreshSession).toHaveBeenCalledWith(runtimeConfig.stacks[0], 'ltbase-refresh');
    });

    expect(await screen.findByRole('button', { name: 'Logout' })).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem('ltbase-controlplane-session:prod') ?? 'null')).toEqual({
      accessToken: 'ltbase-access-refreshed',
      refreshToken: 'ltbase-refresh-refreshed',
      subject: 'admin@example.com',
      providerName: 'primary',
    });
  });

  it('clears a restored LTBase session when refresh fails', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.refreshSession.mockRejectedValue(new Error('token exchange failed: 401'));
    window.sessionStorage.setItem(
      'ltbase-controlplane-session:prod',
      JSON.stringify({
        accessToken: 'ltbase-access-stale',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
        providerName: 'primary',
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(mocks.refreshSession).toHaveBeenCalledWith(runtimeConfig.stacks[0], 'ltbase-refresh');
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem('ltbase-controlplane-session:prod')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Login with Primary Firebase' })).toBeInTheDocument();
    expect(screen.getByText('token exchange failed: 401')).toBeInTheDocument();
  });

  it('ignores restored-session refresh completion after logout clears the stack session', async () => {
    let resolveRefresh: ((value: { accessToken: string; refreshToken: string }) => void) | undefined;

    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.refreshSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    window.sessionStorage.setItem(
      'ltbase-controlplane-session:prod',
      JSON.stringify({
        accessToken: 'ltbase-access-stale',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
        providerName: 'primary',
      }),
    );

    render(<App />);

    await screen.findByRole('button', { name: 'Logout' });
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    resolveRefresh?.({
      accessToken: 'ltbase-access-refreshed',
      refreshToken: 'ltbase-refresh-refreshed',
    });

    await waitFor(() => {
      expect(mocks.firebaseSignOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(window.sessionStorage.getItem('ltbase-controlplane-session:prod')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Login with Primary Firebase' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  });

  it('resumes Supabase callback completion automatically on callback page load', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue({
      stacks: [
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
      ],
    });
    mocks.supabaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'supabase-provider-jwt',
      subjectLabel: 'backup-admin@example.com',
    });
    mocks.exchangeExternalToken.mockResolvedValue({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });
    window.sessionStorage.setItem(
      'ltbase-controlplane-pending-login:prod',
      JSON.stringify({ providerName: 'backup', providerType: 'supabase' }),
    );
    window.history.replaceState({}, '', '/auth/callback?code=supabase-code');

    render(<App />);

    await waitFor(() => {
      expect(mocks.supabaseSignIn).toHaveBeenCalledTimes(1);
      expect(mocks.exchangeExternalToken).toHaveBeenCalledWith(
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
        'backup',
        'supabase-provider-jwt',
      );
    });

    expect(await screen.findByText('Connected to LTBase as backup-admin@example.com')).toBeInTheDocument();
  });

  it('clears the visible session immediately when switching to a different stack', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue(runtimeConfig);
    mocks.firebaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'provider-jwt',
      subjectLabel: 'admin@example.com',
    });
    mocks.exchangeExternalToken.mockResolvedValue({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });

    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Login with Primary Firebase' }));
    await screen.findByRole('button', { name: 'Logout' });

    await userEvent.selectOptions(screen.getByRole('combobox'), 'staging');

    expect(screen.getByRole('button', { name: 'Login with Partner Firebase' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard ready: false')).toBeInTheDocument();
  });

  it('refreshes a restored session only once across StrictMode remount for the same stored refresh token', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue({
      stacks: [runtimeConfig.stacks[0]],
    });
    mocks.refreshSession.mockResolvedValue({
      accessToken: 'ltbase-access-refreshed',
      refreshToken: 'ltbase-refresh-refreshed',
    });
    window.sessionStorage.setItem(
      'ltbase-controlplane-session:prod',
      JSON.stringify({
        accessToken: 'ltbase-access-stale',
        refreshToken: 'ltbase-refresh',
        subject: 'admin@example.com',
        providerName: 'primary',
      }),
    );

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
      expect(mocks.refreshSession).toHaveBeenCalledWith(runtimeConfig.stacks[0], 'ltbase-refresh');
    });
    expect(window.sessionStorage.getItem('ltbase-controlplane-refresh-marker:prod')).toBeNull();
  });

  it('resumes a pending Supabase callback for the matching stack instead of the currently selected stack', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue({
      stacks: [
        runtimeConfig.stacks[1],
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
      ],
    });
    mocks.supabaseSignIn.mockResolvedValue({
      type: 'token',
      externalToken: 'supabase-provider-jwt',
      subjectLabel: 'backup-admin@example.com',
    });
    mocks.exchangeExternalToken.mockResolvedValue({
      accessToken: 'ltbase-access',
      refreshToken: 'ltbase-refresh',
    });
    window.sessionStorage.setItem(
      'ltbase-controlplane-pending-login:prod',
      JSON.stringify({ providerName: 'backup', providerType: 'supabase' }),
    );
    window.history.replaceState({}, '', '/auth/callback?code=supabase-code');

    render(<App />);

    await waitFor(() => {
      expect(mocks.supabaseSignIn).toHaveBeenCalledTimes(1);
      expect(mocks.exchangeExternalToken).toHaveBeenCalledWith(
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
        'backup',
        'supabase-provider-jwt',
      );
    });

    expect(window.sessionStorage.getItem('ltbase-controlplane-pending-login:prod')).toBeNull();
    expect(await screen.findByText('Connected to LTBase as backup-admin@example.com')).toBeInTheDocument();
  });

  it('does not restart OAuth on a direct callback visit without a pending Supabase login', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue({
      stacks: [
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
      ],
    });
    window.history.replaceState({}, '', '/auth/callback?code=supabase-code');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login with Backup Supabase' })).toBeInTheDocument();
    });
    expect(mocks.supabaseSignIn).not.toHaveBeenCalled();
    expect(mocks.exchangeExternalToken).not.toHaveBeenCalled();
  });

  it('clears a stale pending Supabase callback marker when no completed session exists', async () => {
    mocks.loadRuntimeConfig.mockResolvedValue({
      stacks: [
        {
          ...runtimeConfig.stacks[0],
          redirectUri: 'http://localhost:3000/auth/callback',
        },
      ],
    });
    mocks.supabaseSignIn.mockResolvedValue({ type: 'redirect' });
    window.sessionStorage.setItem(
      'ltbase-controlplane-pending-login:prod',
      JSON.stringify({ providerName: 'backup', providerType: 'supabase' }),
    );
    window.history.replaceState({}, '', '/auth/callback?code=supabase-code');

    render(<App />);

    await waitFor(() => {
      expect(mocks.supabaseSignIn).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(window.sessionStorage.getItem('ltbase-controlplane-pending-login:prod')).toBeNull();
    });
    expect(mocks.exchangeExternalToken).not.toHaveBeenCalled();
    expect(screen.getByText('Supabase sign-in did not complete')).toBeInTheDocument();
  });
});
