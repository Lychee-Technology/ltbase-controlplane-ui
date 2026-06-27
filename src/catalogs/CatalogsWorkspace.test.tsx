import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogsWorkspace } from './CatalogsWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  getCapabilityCatalog: vi.fn<() => Promise<unknown>>(),
  putCapabilityCatalog: vi.fn<() => Promise<unknown>>(),
  getActionTemplateCatalog: vi.fn<() => Promise<unknown>>(),
  putActionTemplateCatalog: vi.fn<() => Promise<unknown>>(),
  getAssistantRoleCatalog: vi.fn<() => Promise<unknown>>(),
  putAssistantRoleCatalog: vi.fn<() => Promise<unknown>>(),
  getComplianceProfile: vi.fn<() => Promise<unknown>>(),
  putComplianceProfile: vi.fn<() => Promise<unknown>>(),
}));

function makeClient(overrides?: Partial<ControlPlaneClient>): ControlPlaneClient {
  return {
    getStatus: vi.fn(),
    getSchemaStatus: vi.fn(),
    getAuthConfig: vi.fn(),
    listWorkflows: vi.fn(),
    getCapabilityCatalog: mocks.getCapabilityCatalog,
    putCapabilityCatalog: mocks.putCapabilityCatalog,
    getActionTemplateCatalog: mocks.getActionTemplateCatalog,
    putActionTemplateCatalog: mocks.putActionTemplateCatalog,
    getAssistantRoleCatalog: mocks.getAssistantRoleCatalog,
    putAssistantRoleCatalog: mocks.putAssistantRoleCatalog,
    getComplianceProfile: mocks.getComplianceProfile,
    putComplianceProfile: mocks.putComplianceProfile,
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

const capabilityResponse = {
  project_id: 'proj-1',
  data: '{"version":1,"capabilities":[]}',
};

const complianceResponse = {
  project_id: 'proj-1',
  data: '{"version":1,"controls":[{"id":"capability_must_have_policy","mode":"warn"}]}',
};

const assistantRolesResponse = {
  project_id: 'proj-1',
  data: '{"version":1,"roles":[]}',
};

describe('CatalogsWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<CatalogsWorkspace client={null} />);
    expect(screen.getByText('Sign in to a stack to manage catalogs and compliance.')).toBeInTheDocument();
  });

  it('loads capability catalog by default', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });
    expect(mocks.getCapabilityCatalog).toHaveBeenCalled();
  });

  it('switches tabs and loads the corresponding catalog', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);
    mocks.getComplianceProfile.mockResolvedValue(complianceResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Compliance Profile'));

    await waitFor(() => {
      expect(screen.getByLabelText('Compliance Profile JSON')).toBeInTheDocument();
    });
    expect(mocks.getComplianceProfile).toHaveBeenCalled();
  });

  it('shows loading state followed by content', async () => {
    mocks.getCapabilityCatalog.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(capabilityResponse), 50)),
    );

    render(<CatalogsWorkspace client={makeClient()} />);

    expect(screen.getByText('Loading capability catalog…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });
  });

  it('shows error state and retry button on load failure', async () => {
    mocks.getCapabilityCatalog.mockRejectedValue(new Error('Network error'));

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows client validation error for invalid JSON', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Capability Catalog JSON'), {
      target: { value: '{broken' },
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/position|token|end of|Invalid/i)).toBeInTheDocument();
    });
  });

  it('rejects JSON arrays as invalid top-level', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Capability Catalog JSON'), {
      target: { value: '[1,2,3]' },
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/must be a JSON object/i)).toBeInTheDocument();
    });
  });

  it('submits valid capability catalog and shows saved', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);
    mocks.putCapabilityCatalog.mockResolvedValue(capabilityResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mocks.putCapabilityCatalog).toHaveBeenCalledWith({
        version: 1,
        capabilities: [],
      });
      expect(screen.getByText('Saved successfully.')).toBeInTheDocument();
    });
  });

  it('displays server-side validation error inline', async () => {
    mocks.getCapabilityCatalog.mockResolvedValue(capabilityResponse);
    mocks.putCapabilityCatalog.mockRejectedValue({
      code: 'invalid_capability_catalog',
      message: 'capabilities[0]: name is required',
      details: { field: 'data' },
      kind: 'api',
    });

    render(<CatalogsWorkspace client={makeClient()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Capability Catalog JSON')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/invalid_capability_catalog/i)).toBeInTheDocument();
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('shows built-in assistant roles reference when assistant roles tab is active', async () => {
    mocks.getAssistantRoleCatalog.mockResolvedValue(assistantRolesResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await userEvent.click(screen.getByText('Assistant Role Catalog'));

    await waitFor(() => {
      expect(screen.getByText('Built-in Roles')).toBeInTheDocument();
    });
    const builtinNames = screen.getAllByText(/general|real_estate|insurance|financial/);
    expect(builtinNames.length).toBeGreaterThanOrEqual(4);
  });

  it('shows compliance profile reference note when compliance tab is active', async () => {
    mocks.getComplianceProfile.mockResolvedValue(complianceResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await userEvent.click(screen.getByText('Compliance Profile'));

    await waitFor(() => {
      expect(screen.getByText('About Compliance Profile')).toBeInTheDocument();
    });
  });

  it('submits assistant role catalog', async () => {
    mocks.getAssistantRoleCatalog.mockResolvedValue(assistantRolesResponse);
    mocks.putAssistantRoleCatalog.mockResolvedValue(assistantRolesResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await userEvent.click(screen.getByText('Assistant Role Catalog'));

    await waitFor(() => {
      expect(screen.getByLabelText('Assistant Role Catalog JSON')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mocks.putAssistantRoleCatalog).toHaveBeenCalledWith({
        version: 1,
        roles: [],
      });
    });
  });

  it('submits compliance profile', async () => {
    mocks.getComplianceProfile.mockResolvedValue(complianceResponse);
    mocks.putComplianceProfile.mockResolvedValue(complianceResponse);

    render(<CatalogsWorkspace client={makeClient()} />);

    await userEvent.click(screen.getByText('Compliance Profile'));

    await waitFor(() => {
      expect(screen.getByLabelText('Compliance Profile JSON')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mocks.putComplianceProfile).toHaveBeenCalledWith({
        version: 1,
        controls: [{ id: 'capability_must_have_policy', mode: 'warn' }],
      });
    });
  });
});
