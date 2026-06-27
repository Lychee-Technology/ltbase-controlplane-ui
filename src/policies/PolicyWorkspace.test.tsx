import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PolicyWorkspace } from './PolicyWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  listPolicies: vi.fn<() => Promise<unknown>>(),
  getAuthConfig: vi.fn<() => Promise<unknown>>(),
  getPolicy: vi.fn<() => Promise<unknown>>(),
  createPolicy: vi.fn<() => Promise<unknown>>(),
  updatePolicy: vi.fn<() => Promise<unknown>>(),
  deletePolicy: vi.fn<() => Promise<unknown>>(),
}));

function makeClient(overrides?: Partial<ControlPlaneClient>): ControlPlaneClient {
  return {
    getStatus: vi.fn(),
    getSchemaStatus: vi.fn(),
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
    getAuthConfig: mocks.getAuthConfig,
    listPolicies: mocks.listPolicies,
    getPolicy: mocks.getPolicy,
    createPolicy: mocks.createPolicy,
    updatePolicy: mocks.updatePolicy,
    deletePolicy: mocks.deletePolicy,
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
    listOrgUnits: vi.fn(),
    getOrgUnit: vi.fn(),
    createOrgUnit: vi.fn(),
    updateOrgUnit: vi.fn(),
    deleteOrgUnit: vi.fn(),
    listOrgUnitUsers: vi.fn(),
    moveUserToOrgUnit: vi.fn(),
    listOrgUnitPolicies: vi.fn(),
    attachOrgUnitPolicy: vi.fn(),
    detachOrgUnitPolicy: vi.fn(),
    getUserManager: vi.fn(),
    setUserManager: vi.fn(),
    clearUserManager: vi.fn(),
    listUserDirectReports: vi.fn(),
    getOrgChart: vi.fn(),
    ...overrides,
  };
}

const samplePolicies = {
  items: [
    {
      policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
      name: 'Sales Read',
      description: 'Read sales data',
      slug: 'policy.sales_read',
      external_key: 'pr-v1',
      document: { statements: [{ effect: 'allow', ops: ['read'], schema: 'lead' }] },
      created_at: 1760000000000,
      updated_at: 1760000000000,
    },
    {
      policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04',
      name: 'Admin',
      slug: 'admin.controlplane',
      document: null,
      created_at: 0,
      updated_at: 0,
    },
  ],
};

const sampleAuthConfig = {
  data: {
    users: [{ user_id: 'user-1' }],
    roles: [{ role_id: 'role-admin', name: 'Admins' }],
    org_units: [{ ou_id: 'ou-root', name: 'Root' }],
    referrals: [{ code: 'CODE-A', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03' }],
    principal_policy_attachments: [
      { principal_type: 'user', principal_id: 'user-1', policy_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03' },
    ],
    ou_policy_attachments: [],
    policies: [],
    binding_policies: [],
    warnings: [],
    legacy: {},
  },
};

describe('PolicyWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<PolicyWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage policies.')).toBeInTheDocument();
  });

  it('renders policy list after loading', async () => {
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);

    render(<PolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Read')).toBeInTheDocument();
    });
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to a stack to manage policies.')).not.toBeInTheDocument();
  });

  it('shows create policy form and submits', async () => {
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.createPolicy.mockResolvedValue({
      data: {
        policy: {
          policy_id: 'new-policy-id',
          name: 'New Policy',
          slug: '',
          document: { statements: [] },
          created_at: 0,
          updated_at: 0,
        },
      },
    });
    mocks.getPolicy.mockResolvedValue({
      data: {
        policy: {
          policy_id: 'new-policy-id',
          name: 'New Policy',
          slug: '',
          document: { statements: [] },
          created_at: 0,
          updated_at: 0,
        },
      },
    });

    const client = makeClient();
    render(<PolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Read')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Create'));

    expect(screen.getByText('Create Policy')).toBeInTheDocument();
    expect(screen.getByLabelText('Policy document JSON')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText('e.g. Sales Read Policy'));
    await userEvent.type(screen.getByPlaceholderText('e.g. Sales Read Policy'), 'New Policy');

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mocks.createPolicy).toHaveBeenCalledWith({
        name: 'New Policy',
        description: '',
        policy_document: { statements: [] },
      });
    });
  });

  it('shows empty state when no policies exist', async () => {
    mocks.listPolicies.mockResolvedValue({ items: [] });
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);

    render(<PolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('No policies defined. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.listPolicies.mockRejectedValue(new Error('Network error'));

    render(<PolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows policy detail when a policy is clicked', async () => {
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.getPolicy.mockResolvedValue({
      data: {
        policy: samplePolicies.items[0],
      },
    });

    const client = makeClient();
    render(<PolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Read')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Sales Read'));

    await waitFor(() => {
      expect(mocks.getPolicy).toHaveBeenCalledWith('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    });
  });

  it('allows attempting delete on a referenced policy and surfaces policy_in_use', async () => {
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    // Sales Read (cc03) is referenced by user-1 and referral CODE-A in sampleAuthConfig.
    mocks.getPolicy.mockResolvedValue({ data: { policy: samplePolicies.items[0] } });
    mocks.deletePolicy.mockRejectedValue({ code: 'policy_in_use', message: 'policy is referenced' });

    render(<PolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Sales Read')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Sales Read'));

    // Delete is clickable even though the policy has references (no client-side block).
    const deleteButton = await screen.findByRole('button', { name: /Delete/ });
    expect(deleteButton).toBeEnabled();

    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(mocks.deletePolicy).toHaveBeenCalledWith('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    });
    expect(await screen.findByText(/still attached/i)).toBeInTheDocument();
  });
});
