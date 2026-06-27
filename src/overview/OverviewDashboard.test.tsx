import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewDashboard } from './OverviewDashboard';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import type { WorkspaceKey } from '../types';

const mockClient = vi.hoisted(() => ({
  getStatus: vi.fn<() => Promise<unknown>>(),
  getSchemaStatus: vi.fn<() => Promise<unknown>>(),
  getAuthConfig: vi.fn<() => Promise<unknown>>(),
}));

function makeClient(overrides?: Partial<ControlPlaneClient>): ControlPlaneClient {
  return {
    getStatus: mockClient.getStatus,
    getSchemaStatus: mockClient.getSchemaStatus,
    getAuthConfig: mockClient.getAuthConfig,
    listWorkflows: vi.fn(),
    getCapabilityCatalog: vi.fn(),
    putCapabilityCatalog: vi.fn(),
    getActionTemplateCatalog: vi.fn(),
    putActionTemplateCatalog: vi.fn(),
    getComplianceProfile: vi.fn(),
    putComplianceProfile: vi.fn(),
    listReferrals: vi.fn(),
    createReferral: vi.fn(),
    importReferrals: vi.fn(),
    updateReferralExpiration: vi.fn(),
    disableReferral: vi.fn(),
    deleteReferral: vi.fn(),
    dryRunRepair: vi.fn(),
    applyRepair: vi.fn(),
    listPolicies: vi.fn(),
    getPolicy: vi.fn(),
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
    listRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listRolePolicies: vi.fn(),
    attachRolePolicy: vi.fn(),
    detachRolePolicy: vi.fn(),
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    attachUserRole: vi.fn(),
    detachUserRole: vi.fn(),
    listUserPolicies: vi.fn(),
    attachUserPolicy: vi.fn(),
    detachUserPolicy: vi.fn(),
    listBindingPolicies: vi.fn(),
    createBindingPolicy: vi.fn(),
    updateBindingPolicy: vi.fn(),
    deleteBindingPolicy: vi.fn(),
    ...overrides,
  };
}

const fullStatusPayload = {
  data: {
    project_id: '11111111-1111-4111-8111-111111111111',
    project_name: 'test-project',
    account_id: '999999999999',
    api_base_url: 'https://api.example.com',
    has_runtime_info: true,
  },
};

const fullSchemaPayload = {
  data: {
    project_id: '11111111-1111-4111-8111-111111111111',
    applied_schema_version: 'v1.2.3',
    applied_schema_sha256: 'abc123def4567890fed9876543210cba',
    applied_schema_at: 1700000000000,
    published_version: 'v1.2.0',
    published_sha256: 'fed9876543210cbaabc123def4567890',
  },
};

const fullAuthPayload = {
  data: {
    summary: {
      users: 5,
      roles: 3,
      policies: 2,
      referrals: 4,
      warnings: 1,
    },
    org_units: [{}, {}, {}],
    warnings: [{ code: 'w1', message: 'test' }],
    authorization_model: {
      canonical_object: 'policy',
      canonical_principal_relationship: 'principal_policy_attachment',
      canonical_org_relationship: 'ou_policy_attachment',
      permission_status: 'legacy_compatibility',
      legacy_data_location: 'internal_or_migration_output_only',
      policy_depends_on_permission: false,
    },
  },
};

describe('OverviewDashboard', () => {
  let navigateCalls: WorkspaceKey[];

  beforeEach(() => {
    navigateCalls = [];
    mockClient.getStatus.mockReset();
    mockClient.getSchemaStatus.mockReset();
    mockClient.getAuthConfig.mockReset();
  });

  function renderDashboard(client: ControlPlaneClient | null) {
    return render(
      <OverviewDashboard
        client={client}
        onNavigate={(key) => {
          navigateCalls.push(key);
        }}
      />,
    );
  }

  it('shows a sign-in prompt when no client is provided', () => {
    renderDashboard(null);

    expect(screen.getByText('Sign in to a stack to load the project overview.')).toBeInTheDocument();
  });

  it('shows loading state while fetching', async () => {
    mockClient.getStatus.mockReturnValue(new Promise(() => {}));
    mockClient.getSchemaStatus.mockReturnValue(new Promise(() => {}));
    mockClient.getAuthConfig.mockReturnValue(new Promise(() => {}));

    renderDashboard(makeClient());

    expect(screen.getByText('Loading dashboard data…')).toBeInTheDocument();
  });

  it('renders project info after APIs resolve', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('11111111-1111-4111-8111-111111111111')).toBeInTheDocument();
    expect(screen.getByText('999999999999')).toBeInTheDocument();
    expect(screen.getByText('https://api.example.com')).toBeInTheDocument();
    expect(screen.getByText('Runtime available')).toBeInTheDocument();
  });

  it('renders applied and published schema versions', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('abc123def456…')).toBeInTheDocument();
    expect(screen.getByText('fed987654321…')).toBeInTheDocument();
  });

  it('shows "Not applied" and "No published schema" when schema fields are empty', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue({ data: { project_id: 'p' } });
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('Not applied')).toBeInTheDocument();
    expect(screen.getByText('No published schema')).toBeInTheDocument();
  });

  it('renders summary count cards', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('5')).toBeInTheDocument();
    const threes = screen.getAllByText('3');
    expect(threes).toHaveLength(2);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Policies')).toBeInTheDocument();
    expect(screen.getByText('Org Units')).toBeInTheDocument();
    expect(screen.getByText('Referrals')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
  });

  it('calls onNavigate when count cards are clicked', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    await userEvent.click(screen.getByRole('button', { name: /5\s+Users/ }));
    await userEvent.click(screen.getByRole('button', { name: /3\s+Roles/ }));
    await userEvent.click(screen.getByRole('button', { name: /2\s+Policies/ }));
    await userEvent.click(screen.getByRole('button', { name: /3\s+Org Units/ }));
    await userEvent.click(screen.getByRole('button', { name: /4\s+Referrals/ }));
    await userEvent.click(screen.getByRole('button', { name: /1\s+Warnings/ }));

    expect(navigateCalls).toEqual(['users', 'roles', 'policies', 'organization', 'referrals', 'health']);
  });

  it('renders authorization model canonical fields', async () => {
    mockClient.getStatus.mockResolvedValue(fullStatusPayload);
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('policy')).toBeInTheDocument();
    expect(screen.getByText('principal_policy_attachment')).toBeInTheDocument();
    expect(screen.getByText('ou_policy_attachment')).toBeInTheDocument();
    expect(screen.getByText('legacy_compatibility')).toBeInTheDocument();
    expect(screen.getByText('internal_or_migration_output_only')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows error message when API calls fail', async () => {
    mockClient.getStatus.mockRejectedValue({
      code: 'network_error',
      message: 'Could not reach the Control Plane API.',
      kind: 'network',
    });

    renderDashboard(makeClient());

    await waitFor(() => {
      expect(screen.getByText('network_error: Could not reach the Control Plane API.')).toBeInTheDocument();
    });
  });

  it('shows "No runtime" pill when hasRuntimeInfo is false', async () => {
    mockClient.getStatus.mockResolvedValue({
      data: { ...fullStatusPayload.data, has_runtime_info: false },
    });
    mockClient.getSchemaStatus.mockResolvedValue(fullSchemaPayload);
    mockClient.getAuthConfig.mockResolvedValue(fullAuthPayload);

    renderDashboard(makeClient());

    await screen.findByText('test-project');

    expect(screen.getByText('No runtime')).toBeInTheDocument();
  });

  it('shows "—" for missing project fields', async () => {
    mockClient.getStatus.mockResolvedValue({ data: {} });
    mockClient.getSchemaStatus.mockResolvedValue({ data: {} });
    mockClient.getAuthConfig.mockResolvedValue({ data: {} });

    renderDashboard(makeClient());

    await screen.findByText('Unnamed Project');

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('does not crash when APIs return malformed payloads', async () => {
    mockClient.getStatus.mockResolvedValue(null);
    mockClient.getSchemaStatus.mockResolvedValue('string');
    mockClient.getAuthConfig.mockResolvedValue(42);

    renderDashboard(makeClient());

    await screen.findByText('Unnamed Project');

    expect(screen.getByText('Unnamed Project')).toBeInTheDocument();
  });
});
