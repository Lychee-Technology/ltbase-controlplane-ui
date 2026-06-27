import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepairWorkspace } from './RepairWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  dryRunRepair: vi.fn<() => Promise<unknown>>(),
  applyRepair: vi.fn<() => Promise<unknown>>(),
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
    dryRunRepair: mocks.dryRunRepair,
    applyRepair: mocks.applyRepair,
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

const sampleRepairPayload = {
  data: {
    project_id: '11111111-1111-4111-8111-111111111111',
    dry_run: true,
    checked_at: 1700000000000,
    results: [
      { object: 'dynamodb.project_record', status: 'ok', detail: 'Project record exists' },
      { object: 'dynamodb.runtime_info', status: 'fixed', detail: 'Created runtime info record' },
      { object: 'postgres.project_sql_objects', status: 'ok', detail: 'All views present' },
      { object: 'postgres.project_sql_read_access', status: 'missing', detail: 'Read access grant missing' },
    ],
    summary: { total: 4, ok: 2, fixed: 1, missing: 1, skipped: 0, error: 0 },
  },
};

describe('RepairWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign-in prompt when no client is available', () => {
    render(<RepairWorkspace client={null} defaultProjectId="" />);
    expect(screen.getByText('Sign in to a stack to run repair operations.')).toBeInTheDocument();
  });

  it('renders the repair operations form with default project id', () => {
    render(<RepairWorkspace client={makeClient()} defaultProjectId="my-project" />);

    expect(screen.getByText('Repair Operations')).toBeInTheDocument();
    expect(screen.getByText('Run Dry-run')).toBeInTheDocument();
    expect(screen.getByText('Apply Repair')).toBeInTheDocument();
    const projectIdInput = screen.getByPlaceholderText('Leave empty to use deployment project') as HTMLInputElement;
    expect(projectIdInput.value).toBe('my-project');
  });

  it('disable apply button when confirm checkbox is unchecked', () => {
    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);
    const applyButton = screen.getByText('Apply Repair');
    expect(applyButton).toBeDisabled();
  });

  it('enables apply button when confirm checkbox is checked', async () => {
    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);
    const confirmCheckbox = screen.getByLabelText(/I confirm that I want to execute the repair/);
    await userEvent.click(confirmCheckbox);
    const applyButton = screen.getByText('Apply Repair');
    expect(applyButton).not.toBeDisabled();
  });

  it('calls dryRunRepair and shows report on success', async () => {
    mocks.dryRunRepair.mockResolvedValue(sampleRepairPayload);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    await userEvent.click(screen.getByText('Run Dry-run'));

    await waitFor(() => {
      expect(mocks.dryRunRepair).toHaveBeenCalledWith({
        force_rebuild_views: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Dry-run Report')).toBeInTheDocument();
    });

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Actions Taken')).toBeInTheDocument();
    expect(screen.getByText('SQL Objects Checked')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
  });

  it('calls dryRunRepair with force_rebuild_views when toggled', async () => {
    mocks.dryRunRepair.mockResolvedValue(sampleRepairPayload);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    const rebuildCheckbox = screen.getByLabelText(/Force rebuild views/);
    await userEvent.click(rebuildCheckbox);
    await userEvent.click(screen.getByText('Run Dry-run'));

    await waitFor(() => {
      expect(mocks.dryRunRepair).toHaveBeenCalledWith({
        force_rebuild_views: true,
      });
    });
  });

  it('calls dryRunRepair with project_id when filled', async () => {
    mocks.dryRunRepair.mockResolvedValue(sampleRepairPayload);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    const projectIdInput = screen.getByPlaceholderText('Leave empty to use deployment project');
    await userEvent.clear(projectIdInput);
    await userEvent.type(projectIdInput, 'custom-proj-123');
    await userEvent.click(screen.getByText('Run Dry-run'));

    await waitFor(() => {
      expect(mocks.dryRunRepair).toHaveBeenCalledWith({
        project_id: 'custom-proj-123',
        force_rebuild_views: false,
      });
    });
  });

  it('shows error message when dryRunRepair fails', async () => {
    mocks.dryRunRepair.mockRejectedValue(new Error('Network error'));

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    await userEvent.click(screen.getByText('Run Dry-run'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls applyRepair with confirm=true when confirmed and submitted', async () => {
    mocks.applyRepair.mockResolvedValue(sampleRepairPayload);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    const confirmCheckbox = screen.getByLabelText(/I confirm that I want to execute the repair/);
    await userEvent.click(confirmCheckbox);
    await userEvent.click(screen.getByText('Apply Repair'));

    await waitFor(() => {
      expect(mocks.applyRepair).toHaveBeenCalledWith({
        force_rebuild_views: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Apply Report')).toBeInTheDocument();
    });
  });

  it('shows error message when applyRepair fails', async () => {
    mocks.applyRepair.mockRejectedValue(new Error('Server error'));

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    const confirmCheckbox = screen.getByLabelText(/I confirm that I want to execute the repair/);
    await userEvent.click(confirmCheckbox);
    await userEvent.click(screen.getByText('Apply Repair'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('resets confirm checkbox after successful apply', async () => {
    mocks.applyRepair.mockResolvedValue(sampleRepairPayload);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);

    const confirmCheckbox = screen.getByLabelText(/I confirm that I want to execute the repair/) as HTMLInputElement;
    await userEvent.click(confirmCheckbox);
    await userEvent.click(screen.getByText('Apply Repair'));

    await waitFor(() => {
      expect(screen.getByText('Apply Report')).toBeInTheDocument();
    });

    expect(confirmCheckbox.checked).toBe(false);
  });

  it('renders empty project_id report without errors', async () => {
    const emptyReport = { data: { project_id: '', dry_run: true, checked_at: 0, results: [], summary: { total: 0, ok: 0, fixed: 0, missing: 0, skipped: 0, error: 0 } } };
    mocks.dryRunRepair.mockResolvedValue(emptyReport);

    render(<RepairWorkspace client={makeClient()} defaultProjectId="" />);
    await userEvent.click(screen.getByText('Run Dry-run'));

    await waitFor(() => {
      expect(screen.getByText('Dry-run Report')).toBeInTheDocument();
    });

    expect(screen.getByText('All OK')).toBeInTheDocument();
  });
});
