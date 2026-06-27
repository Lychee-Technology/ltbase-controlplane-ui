import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralWorkspace } from './ReferralWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  listReferrals: vi.fn<() => Promise<unknown>>(),
  createReferral: vi.fn<() => Promise<unknown>>(),
  importReferrals: vi.fn<() => Promise<unknown>>(),
  updateReferralExpiration: vi.fn<() => Promise<unknown>>(),
  disableReferral: vi.fn<() => Promise<unknown>>(),
  deleteReferral: vi.fn<() => Promise<unknown>>(),
  listPolicies: vi.fn<() => Promise<unknown>>(),
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
    listReferrals: mocks.listReferrals,
    createReferral: mocks.createReferral,
    importReferrals: mocks.importReferrals,
    updateReferralExpiration: mocks.updateReferralExpiration,
    disableReferral: mocks.disableReferral,
    deleteReferral: mocks.deleteReferral,
    dryRunRepair: vi.fn(),
    applyRepair: vi.fn(),
    listPolicies: mocks.listPolicies,
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

const sampleReferrals = {
  items: [
    {
      code: 'CODE1',
      project_id: 'proj-1',
      used_at: 0,
      expires_at: 1800000000000,
      disabled: false,
      created_at: 1690000000000,
      updated_at: 1700000000000,
      status: 'available',
    },
    {
      code: 'CODE2',
      project_id: 'proj-1',
      policy_id: 'policy.read',
      used_at: 1710000000000,
      expires_at: 0,
      disabled: false,
      created_at: 1680000000000,
      updated_at: 1710000000000,
      status: 'used',
    },
  ],
  total: 2,
};

const samplePolicies = {
  items: [
    {
      policy_id: 'policy-read-id',
      name: 'Read Policy',
      description: '',
      slug: 'policy.read',
      external_key: '',
      document: null,
      created_at: 1690000000000,
      updated_at: 1690000000000,
    },
  ],
};

describe('ReferralWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<ReferralWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage referrals.')).toBeInTheDocument();
  });

  it('renders referral list after loading', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });
    expect(screen.getByText('CODE2')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
    expect(screen.getByText('used')).toBeInTheDocument();
  });

  it('shows empty state when no referrals exist', async () => {
    mocks.listReferrals.mockResolvedValue({ items: [], total: 0 });
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText(/No referrals found/i)).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.listReferrals.mockRejectedValue(new Error('Network error'));
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('navigates to create form and submits a new referral', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.createReferral.mockResolvedValue({ data: { code: 'CODE3', project_id: 'proj-1', created_at: 1720000000000 } });

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Referral' })).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText('REF-001'), 'CODE3');
    await userEvent.click(screen.getByRole('button', { name: 'Create Referral' }));

    await waitFor(() => {
      expect(mocks.createReferral).toHaveBeenCalledWith({
        code: 'CODE3',
        expires_at_ms: 0,
      });
    });
  });

  it('shows referral detail when a row is clicked', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('CODE1'));

    await waitFor(() => {
      expect(screen.getByText('Referral Detail')).toBeInTheDocument();
    });
  });

  it('shows disable confirmation and disables a referral', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.disableReferral.mockResolvedValue({ data: { code: 'CODE1', disabled: true, status: 'disabled' } });

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('CODE1'));

    await waitFor(() => {
      expect(screen.getByText('Referral Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Disable'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Disable')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Confirm Disable'));

    await waitFor(() => {
      expect(mocks.disableReferral).toHaveBeenCalledWith('CODE1');
    });
  });

  it('shows delete confirmation and deletes a referral', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.deleteReferral.mockResolvedValue({ data: { code: 'CODE1', status: 'deleted' } });

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('CODE1'));

    await waitFor(() => {
      expect(screen.getByText('Referral Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(mocks.deleteReferral).toHaveBeenCalledWith('CODE1');
    });
  });

  it('shows referral_in_use error when deleting a used referral', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.deleteReferral.mockRejectedValue({ code: 'referral_in_use', message: 'referral in use: CODE2' });

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE2')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('CODE2'));

    await waitFor(() => {
      expect(screen.getByText('Referral Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(screen.getByText(/Cannot delete: this referral code has already been used/i)).toBeInTheDocument();
    });
  });

  it('navigates to import view and shows JSON textarea', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByText('Import Referrals')).toBeInTheDocument();
    });
  });

  it('validates import JSON and shows error for empty input', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Import'));
    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByText(/cannot be empty/i)).toBeInTheDocument();
    });
  });

  it('submits valid import JSON and returns to list', async () => {
    mocks.listReferrals.mockResolvedValue(sampleReferrals);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.importReferrals.mockResolvedValue({ data: { created: 2 } });

    render(<ReferralWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(screen.getByText('Import Referrals')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('[{"referral_code":"CODE1","policy_id":"policy.read"}]');
    fireEvent.change(textarea, { target: { value: '[{"referral_code":"CODE3"},{"referral_code":"CODE4"}]' } });
    await userEvent.click(screen.getByText('Import'));

    await waitFor(() => {
      expect(mocks.importReferrals).toHaveBeenCalledWith([
        { referral_code: 'CODE3', expires_at_ms: undefined },
        { referral_code: 'CODE4', expires_at_ms: undefined },
      ]);
    });
  });
});
