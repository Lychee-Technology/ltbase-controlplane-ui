import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { WorkflowWorkspace } from './WorkflowWorkspace';

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
    getAssistantRoleCatalog: vi.fn(),
    putAssistantRoleCatalog: vi.fn(),
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
  } as unknown as ControlPlaneClient;
}

const samplePayload = {
  items: [
    { name: 'claim-review', active_version: '1.0', referenced_tools: ['tool_a', 'tool_b'] },
    { name: 'evidence-request', active_version: 'v1', referenced_tools: ['demo.evidence'] },
  ],
};

describe('WorkflowWorkspace', () => {
  it('shows sign-in prompt when client is null', () => {
    render(<WorkflowWorkspace client={null} />);

    expect(screen.getByText('Workflow Summaries')).toBeInTheDocument();
    expect(screen.getByText('Sign in to a stack to load workflow summaries.')).toBeInTheDocument();
  });

  it('shows loading state while fetching', async () => {
    let resolvePromise: (value: unknown) => void;
    const listWorkflows = vi.fn(() => new Promise((resolve) => { resolvePromise = resolve; }));
    const client = makeClient({ listWorkflows });

    render(<WorkflowWorkspace client={client} />);

    expect(screen.getByText('Loading workflow summaries…')).toBeInTheDocument();

    resolvePromise!(samplePayload);
    await waitFor(() => {
      expect(screen.queryByText('Loading workflow summaries…')).not.toBeInTheDocument();
    });
  });

  it('renders workflow list with name, version and tools', async () => {
    const listWorkflows = vi.fn().mockResolvedValue(samplePayload);
    const client = makeClient({ listWorkflows });

    render(<WorkflowWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText('claim-review')).toBeInTheDocument();
    });

    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('tool_a, tool_b')).toBeInTheDocument();
    expect(screen.getByText('evidence-request')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('demo.evidence')).toBeInTheDocument();
  });

  it('shows empty state when no workflow definitions found', async () => {
    const listWorkflows = vi.fn().mockResolvedValue({ items: [] });
    const client = makeClient({ listWorkflows });

    render(<WorkflowWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText(/No workflow definitions found/)).toBeInTheDocument();
    });
    expect(screen.getByText('LTBASE_LOCAL_TESTING_WORKFLOW_DEFINITION_PATHS')).toBeInTheDocument();
  });

  it('shows error message and retry button on API failure', async () => {
    const listWorkflows = vi.fn().mockRejectedValue({
      code: 'internal_error',
      message: 'Something went wrong',
    });
    const client = makeClient({ listWorkflows });

    render(<WorkflowWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('retries on button click after error', async () => {
    const listWorkflows = vi
      .fn()
      .mockRejectedValueOnce({ code: 'internal_error', message: 'fail' })
      .mockResolvedValueOnce(samplePayload);
    const client = makeClient({ listWorkflows });

    render(<WorkflowWorkspace client={client} />);

    await waitFor(() => {
      expect(screen.getByText(/fail/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('claim-review')).toBeInTheDocument();
    });
    expect(listWorkflows).toHaveBeenCalledTimes(2);
  });
});
