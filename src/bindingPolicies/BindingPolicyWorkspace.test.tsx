import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BindingPolicyWorkspace } from './BindingPolicyWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  listBindingPolicies: vi.fn<() => Promise<unknown>>(),
  createBindingPolicy: vi.fn<() => Promise<unknown>>(),
  updateBindingPolicy: vi.fn<() => Promise<unknown>>(),
  deleteBindingPolicy: vi.fn<() => Promise<unknown>>(),
}));

function makeClient(overrides?: Partial<ControlPlaneClient>): ControlPlaneClient {
  return {
    getStatus: vi.fn(),
    getSchemaStatus: vi.fn(),
    getAuthConfig: vi.fn(),
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
    listBindingPolicies: mocks.listBindingPolicies,
    createBindingPolicy: mocks.createBindingPolicy,
    updateBindingPolicy: mocks.updateBindingPolicy,
    deleteBindingPolicy: mocks.deleteBindingPolicy,
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

const sampleBindingPolicies = {
  items: [
    {
      policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
      enabled: true,
      priority: 10,
      slug: 'bind.company_email',
      external_key: 'bind-company-email-v1',
      rules: [{ l: 'and', c: [{ a: 'external.email', v: 'ends_with:@company.com' }] }],
      created_at: 1760000000000,
      updated_at: 1760000000000,
    },
    {
      policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee09',
      enabled: false,
      priority: 0,
      slug: '',
      external_key: '',
      rules: [],
      created_at: 0,
      updated_at: 0,
    },
  ],
};

describe('BindingPolicyWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<BindingPolicyWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage binding policies.')).toBeInTheDocument();
  });

  it('renders binding policy list after loading', async () => {
    mocks.listBindingPolicies.mockResolvedValue(sampleBindingPolicies);

    render(<BindingPolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('bind.company_email')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Enabled').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.queryByText('Sign in to a stack to manage binding policies.')).not.toBeInTheDocument();
  });

  it('shows empty state when no policies exist', async () => {
    mocks.listBindingPolicies.mockResolvedValue({ items: [] });

    render(<BindingPolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('No binding policies defined. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.listBindingPolicies.mockRejectedValue(new Error('Network error'));

    render(<BindingPolicyWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('creates a binding policy', async () => {
    mocks.listBindingPolicies.mockResolvedValue(sampleBindingPolicies);
    mocks.createBindingPolicy.mockResolvedValue({
      data: {
        binding_policy: {
          policy_id: 'new-policy-id',
          enabled: true,
          priority: 5,
          slug: 'bind.new',
          external_key: '',
          rules: [{ l: 'and', c: [] }],
          created_at: 0,
          updated_at: 0,
        },
      },
    });

    const client = makeClient();
    render(<BindingPolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('bind.company_email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Create'));

    expect(screen.getByText('Create Binding Policy')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mocks.createBindingPolicy).toHaveBeenCalledWith({
        enabled: true,
        priority: 0,
        rules: [],
      });
    });
  });

  it('shows detail when a policy is clicked', async () => {
    mocks.listBindingPolicies.mockResolvedValue(sampleBindingPolicies);

    const client = makeClient();
    render(<BindingPolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('bind.company_email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('bind.company_email'));

    await waitFor(() => {
      expect(screen.getByText('Binding Policy Detail')).toBeInTheDocument();
      expect(screen.getByText('bind-company-email-v1')).toBeInTheDocument();
    });
  });

  it('deletes a binding policy with confirmation', async () => {
    mocks.listBindingPolicies.mockResolvedValue(sampleBindingPolicies);
    mocks.deleteBindingPolicy.mockResolvedValue({ data: { policy_id: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08', status: 'deleted' } });

    const client = makeClient();
    render(<BindingPolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('bind.company_email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('bind.company_email'));

    const deleteButton = await screen.findByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Confirm Delete' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.deleteBindingPolicy).toHaveBeenCalledWith('0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08');
    });
  });

  it('shows delete error on failure', async () => {
    mocks.listBindingPolicies.mockResolvedValue(sampleBindingPolicies);
    mocks.deleteBindingPolicy.mockRejectedValue(new Error('Cannot delete'));

    const client = makeClient();
    render(<BindingPolicyWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('bind.company_email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('bind.company_email'));

    const deleteButton = await screen.findByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Confirm Delete' });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Cannot delete')).toBeInTheDocument();
    });
  });
});
