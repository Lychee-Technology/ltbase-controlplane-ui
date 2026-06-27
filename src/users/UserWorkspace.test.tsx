import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserWorkspace } from './UserWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn<() => Promise<unknown>>(),
  getUser: vi.fn<() => Promise<unknown>>(),
  updateUser: vi.fn<() => Promise<unknown>>(),
  attachUserRole: vi.fn<() => Promise<unknown>>(),
  detachUserRole: vi.fn<() => Promise<unknown>>(),
  listUserPolicies: vi.fn<() => Promise<unknown>>(),
  attachUserPolicy: vi.fn<() => Promise<unknown>>(),
  detachUserPolicy: vi.fn<() => Promise<unknown>>(),
  getAuthConfig: vi.fn<() => Promise<unknown>>(),
  listRoles: vi.fn<() => Promise<unknown>>(),
  listPolicies: vi.fn<() => Promise<unknown>>(),
}));

function makeClient(overrides?: Partial<ControlPlaneClient>): ControlPlaneClient {
  return {
    getStatus: vi.fn(),
    getSchemaStatus: vi.fn(),
    getAuthConfig: mocks.getAuthConfig,
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
    listPolicies: mocks.listPolicies,
    getPolicy: vi.fn(),
    createPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
    listRoles: mocks.listRoles,
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listRolePolicies: vi.fn(),
    attachRolePolicy: vi.fn(),
    detachRolePolicy: vi.fn(),
    listUsers: mocks.listUsers,
    getUser: mocks.getUser,
    updateUser: mocks.updateUser,
    attachUserRole: mocks.attachUserRole,
    detachUserRole: mocks.detachUserRole,
    listUserPolicies: mocks.listUserPolicies,
    attachUserPolicy: mocks.attachUserPolicy,
    detachUserPolicy: mocks.detachUserPolicy,
    listBindingPolicies: vi.fn(),
    createBindingPolicy: vi.fn(),
    updateBindingPolicy: vi.fn(),
    deleteBindingPolicy: vi.fn(),
    ...overrides,
  };
}

const sampleUsers = {
  items: [
    {
      user_id: 'user-1',
      provider: 'google',
      issuer: 'issuer-1',
      external_sub: 'sub-1',
      primary_ou_id: 'ou-root',
      report_to_user_id: '',
      created_at: 1760000000000,
      updated_at: 1760000000000,
      last_login_at: 1760000000000,
    },
    {
      user_id: 'user-2',
      provider: 'github',
      issuer: 'issuer-2',
      external_sub: 'sub-2',
      primary_ou_id: 'ou-child',
      report_to_user_id: 'user-1',
      created_at: 0,
      updated_at: 0,
      last_login_at: 0,
    },
  ],
};

const sampleUser1Detail = {
  data: {
    user: sampleUsers.items[0],
    roles: [
      { role_id: 'role-admin', name: 'Admin', slug: 'role.admin' },
    ],
  },
};

const sampleAuthConfig = {
  data: {
    users: [
      { user_id: 'user-1', referral_code: 'REF1' },
      { user_id: 'user-2', referral_code: 'REF2' },
    ],
    org_units: [
      { ou_id: 'ou-root', name: 'Root' },
      { ou_id: 'ou-child', name: 'Child' },
    ],
    roles: [],
    policies: [],
    principal_policy_attachments: [],
    ou_policy_attachments: [],
    referrals: [],
    warnings: [],
    legacy: {},
  },
};

const sampleRoleOptions = {
  items: [
    { role_id: 'role-admin', name: 'Admin', slug: 'role.admin' },
    { role_id: 'role-viewer', name: 'Viewer', slug: 'role.viewer' },
  ],
};

const samplePolicyOptions = {
  items: [
    { policy_id: 'policy-read-id', name: 'Read Policy', slug: 'policy.read' },
    { policy_id: 'policy-write-id', name: 'Write Policy', slug: 'policy.write' },
  ],
};

const sampleUserPolicies = {
  items: [
    {
      principal_type: 'user',
      principal_id: 'user-1',
      policy_id: 'policy-read-id',
      policy: {
        policy_id: 'policy-read-id',
        name: 'Read Policy',
        description: '',
        slug: 'policy.read',
        external_key: '',
        document: null,
        created_at: 1760000000000,
        updated_at: 1760000000000,
      },
    },
  ],
};

describe('UserWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<UserWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage users.')).toBeInTheDocument();
  });

  it('renders user list after loading', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });
    expect(screen.getByText('github')).toBeInTheDocument();
  });

  it('shows empty state when no users exist', async () => {
    mocks.listUsers.mockResolvedValue({ items: [] });
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText(/No users found/i)).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.listUsers.mockRejectedValue(new Error('Network error'));
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows user detail when a user is clicked', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(mocks.getUser).toHaveBeenCalledWith('user-1');
    });
    expect(screen.getByText('User Detail')).toBeInTheDocument();
    const issuerElements = screen.getAllByText('issuer-1');
    expect(issuerElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows referral code from auth config enrichment', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('REF1')).toBeInTheDocument();
    });
  });

  it('shows OU label from auth config enrichment', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      const rootElements = screen.getAllByText('Root');
      expect(rootElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows roles tab and detaches a role', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);
    mocks.detachUserRole.mockResolvedValue({ data: { status: 'detached' } });

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('User Detail')).toBeInTheDocument();
    });

    const rolesButton = screen.getByText(/Roles \(1\)/);
    await userEvent.click(rolesButton);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    const detachButton = screen.getByRole('button', { name: /Detach/ });
    await userEvent.click(detachButton);

    await waitFor(() => {
      expect(mocks.detachUserRole).toHaveBeenCalledWith('user-1', 'role-admin');
    });
  });

  it('opens edit org form when Edit Org is clicked', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('User Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Edit Org'));

    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    });
  });

  it('surfaces invalid_org_cycle error on org save', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);
    mocks.updateUser.mockRejectedValue({ code: 'invalid_org_cycle', message: 'cycle detected' });

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('Edit Org')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Edit Org'));

    await waitFor(() => {
      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/organization cycle/i)).toBeInTheDocument();
    });
  });

  it('shows policies tab and attaches a policy', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);
    mocks.listUserPolicies.mockResolvedValue({ items: [] });
    mocks.attachUserPolicy.mockResolvedValue({ data: { status: 'attached' } });

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('User Detail')).toBeInTheDocument();
    });

    const policiesButton = screen.getByText('Direct Policies');
    await userEvent.click(policiesButton);

    await waitFor(() => {
      expect(screen.getByText(/No policies directly attached/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'policy-write-id');

    await waitFor(() => {
      expect(mocks.attachUserPolicy).toHaveBeenCalledWith('user-1', 'policy-write-id');
    });
  });

  it('surfaces an error when picker indexes fail to load', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockRejectedValue(new Error('Indexes unavailable'));
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(
        screen.getByText(/Could not load OU, role, and policy options/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Indexes unavailable/)).toBeInTheDocument();
  });

  it('detaches a policy from user', async () => {
    mocks.listUsers.mockResolvedValue(sampleUsers);
    mocks.getAuthConfig.mockResolvedValue(sampleAuthConfig);
    mocks.listRoles.mockResolvedValue(sampleRoleOptions);
    mocks.listPolicies.mockResolvedValue(samplePolicyOptions);
    mocks.getUser.mockResolvedValue(sampleUser1Detail);
    mocks.listUserPolicies.mockResolvedValue(sampleUserPolicies);
    mocks.detachUserPolicy.mockResolvedValue({ data: { status: 'detached' } });

    render(<UserWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('google'));

    await waitFor(() => {
      expect(screen.getByText('User Detail')).toBeInTheDocument();
    });

    const policiesButton = screen.getByText('Direct Policies');
    await userEvent.click(policiesButton);

    await waitFor(() => {
      expect(screen.getByText('Read Policy')).toBeInTheDocument();
    });

    const detachButton = screen.getByRole('button', { name: /Detach/ });
    await userEvent.click(detachButton);

    await waitFor(() => {
      expect(mocks.detachUserPolicy).toHaveBeenCalledWith('user-1', 'policy-read-id');
    });
  });
});
