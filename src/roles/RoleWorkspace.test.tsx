import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleWorkspace } from './RoleWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  listRoles: vi.fn<() => Promise<unknown>>(),
  getRole: vi.fn<() => Promise<unknown>>(),
  createRole: vi.fn<() => Promise<unknown>>(),
  updateRole: vi.fn<() => Promise<unknown>>(),
  deleteRole: vi.fn<() => Promise<unknown>>(),
  listRolePolicies: vi.fn<() => Promise<unknown>>(),
  attachRolePolicy: vi.fn<() => Promise<unknown>>(),
  detachRolePolicy: vi.fn<() => Promise<unknown>>(),
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
    getRole: mocks.getRole,
    createRole: mocks.createRole,
    updateRole: mocks.updateRole,
    deleteRole: mocks.deleteRole,
    listRolePolicies: mocks.listRolePolicies,
    attachRolePolicy: mocks.attachRolePolicy,
    detachRolePolicy: mocks.detachRolePolicy,
    listUsers: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    attachUserRole: vi.fn(),
    detachUserRole: vi.fn(),
    listUserPolicies: vi.fn(),
    attachUserPolicy: vi.fn(),
    detachUserPolicy: vi.fn(),
    ...overrides,
  };
}

const sampleRoles = {
  items: [
    {
      role_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
      name: 'Admin',
      description: 'System admin',
      slug: 'role.admin',
      external_key: 'rk-admin',
      parent_role_ids: [],
      created_at: 1760000000000,
      updated_at: 1760000000000,
    },
    {
      role_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04',
      name: 'Viewer',
      description: 'Read-only',
      slug: 'role.viewer',
      external_key: '',
      parent_role_ids: ['0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03'],
      created_at: 0,
      updated_at: 0,
    },
  ],
};

const sampleAdminDetail = {
  data: {
    role: sampleRoles.items[0],
  },
};

const sampleViewerDetail = {
  data: {
    role: sampleRoles.items[1],
  },
};

const samplePolicies = {
  items: [
    {
      policy_id: 'policy-read-id',
      name: 'Read Policy',
      slug: 'policy.read',
    },
    {
      policy_id: 'policy-write-id',
      name: 'Write Policy',
      slug: 'policy.write',
    },
  ],
};

const sampleRolePolicies = {
  items: [
    {
      principal_type: 'role',
      principal_id: '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
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

describe('RoleWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<RoleWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage roles.')).toBeInTheDocument();
  });

  it('renders role list after loading', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('shows empty state when no roles exist', async () => {
    mocks.listRoles.mockResolvedValue({ items: [] });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('No roles defined. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.listRoles.mockRejectedValue(new Error('Network error'));

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows role detail when a role is clicked', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleAdminDetail);

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Admin'));

    await waitFor(() => {
      expect(mocks.getRole).toHaveBeenCalledWith('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    });
  });

  it('jumps to role by role_id', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleViewerDetail);

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    const jumpInput = screen.getByPlaceholderText('Enter role_id or slug');
    await userEvent.type(jumpInput, '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04');
    await userEvent.click(screen.getByRole('button', { name: /Open/ }));

    await waitFor(() => {
      expect(mocks.getRole).toHaveBeenCalledWith('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc04');
    });
    expect(screen.getByText('Role Detail')).toBeInTheDocument();
  });

  it('jumps to role by slug', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleViewerDetail);

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    const jumpInput = screen.getByPlaceholderText('Enter role_id or slug');
    await userEvent.type(jumpInput, 'role.viewer');
    await userEvent.click(screen.getByRole('button', { name: /Open/ }));

    await waitFor(() => {
      expect(mocks.getRole).toHaveBeenCalledWith('role.viewer');
    });
  });

  it('shows not-found message when jump fails', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockRejectedValue({ code: 'not_found', message: 'role not found' });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    const jumpInput = screen.getByPlaceholderText('Enter role_id or slug');
    await userEvent.type(jumpInput, 'nonexistent');
    await userEvent.click(screen.getByRole('button', { name: /Open/ }));

    await waitFor(() => {
      expect(screen.getByText('No role found for this role_id or slug')).toBeInTheDocument();
    });
  });

  it('deletes role successfully', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleAdminDetail);
    mocks.deleteRole.mockResolvedValue({ data: { status: 'deleted' } });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Admin'));

    const deleteButton = await screen.findByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(mocks.deleteRole).toHaveBeenCalledWith('0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03');
    });
  });

  it('surfaces role_in_use error on delete', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleAdminDetail);
    mocks.deleteRole.mockRejectedValue({ code: 'role_in_use', message: 'role is in use' });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Admin'));

    const deleteButton = await screen.findByRole('button', { name: /Delete/ });
    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(screen.getByText(/still in use/i)).toBeInTheDocument();
    });
  });

  it('shows policies tab and attaches a policy', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleAdminDetail);
    mocks.listRolePolicies.mockResolvedValue(sampleRolePolicies);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.attachRolePolicy.mockResolvedValue({ data: { status: 'attached' } });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Admin'));

    await waitFor(() => {
      expect(screen.getByText('Role Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Policies'));

    await waitFor(() => {
      expect(screen.getByText('Read Policy')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'policy-write-id');

    await waitFor(() => {
      expect(mocks.attachRolePolicy).toHaveBeenCalledWith(
        '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
        'policy-write-id',
      );
    });
  });

  it('detaches a policy from role', async () => {
    mocks.listRoles.mockResolvedValue(sampleRoles);
    mocks.getRole.mockResolvedValue(sampleAdminDetail);
    mocks.listRolePolicies.mockResolvedValue(sampleRolePolicies);
    mocks.listPolicies.mockResolvedValue(samplePolicies);
    mocks.detachRolePolicy.mockResolvedValue({ data: { status: 'detached' } });

    render(<RoleWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Admin'));

    await waitFor(() => {
      expect(screen.getByText('Role Detail')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Policies'));

    await waitFor(() => {
      expect(screen.getByText('Read Policy')).toBeInTheDocument();
    });

    const detachButton = screen.getByRole('button', { name: /Detach/ });
    await userEvent.click(detachButton);

    await waitFor(() => {
      expect(mocks.detachRolePolicy).toHaveBeenCalledWith(
        '0192e0a1-7c3d-7b2a-9f10-aa01bb02cc03',
        'policy-read-id',
      );
    });
  });
});
