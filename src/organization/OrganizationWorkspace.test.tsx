import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationWorkspace } from './OrganizationWorkspace';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const ou = {
  ou_id: 'ou-1',
  name: 'Engineering',
  parent_ou_id: '',
  ou_path: '/ou-1',
  block_inheritance: false,
  created_at: 0,
  updated_at: 0,
};

const mocks = vi.hoisted(() => ({
  listOrgUnits: vi.fn<() => Promise<unknown>>(),
  getOrgUnit: vi.fn<() => Promise<unknown>>(),
  updateOrgUnit: vi.fn<() => Promise<unknown>>(),
  deleteOrgUnit: vi.fn<() => Promise<unknown>>(),
  listOrgUnitUsers: vi.fn<() => Promise<unknown>>(),
  listOrgUnitPolicies: vi.fn<() => Promise<unknown>>(),
  attachOrgUnitPolicy: vi.fn<() => Promise<unknown>>(),
  getUserManager: vi.fn<() => Promise<unknown>>(),
  setUserManager: vi.fn<() => Promise<unknown>>(),
  listUserDirectReports: vi.fn<() => Promise<unknown>>(),
  getOrgChart: vi.fn<() => Promise<unknown>>(),
  listUsers: vi.fn<() => Promise<unknown>>(),
  listPolicies: vi.fn<() => Promise<unknown>>(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listOrgUnits.mockResolvedValue({ items: [ou] });
  mocks.getOrgUnit.mockResolvedValue({ data: { org_unit: ou } });
  mocks.updateOrgUnit.mockResolvedValue({});
  mocks.deleteOrgUnit.mockResolvedValue({});
  mocks.listOrgUnitUsers.mockResolvedValue({ items: [] });
  mocks.listOrgUnitPolicies.mockResolvedValue({ items: [] });
  mocks.attachOrgUnitPolicy.mockResolvedValue({});
  mocks.getUserManager.mockResolvedValue({ data: { user: { user_id: 'user-a' }, manager: null } });
  mocks.setUserManager.mockResolvedValue({});
  mocks.listUserDirectReports.mockResolvedValue({ items: [{ user_id: 'report-1' }] });
  mocks.listUsers.mockResolvedValue({ items: [{ user_id: 'user-a' }, { user_id: 'user-b' }] });
  mocks.listPolicies.mockResolvedValue({ items: [{ policy_id: 'pol-1', name: 'Policy One', slug: 'p1' }] });
});

function makeClient(): ControlPlaneClient {
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
    listRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listRolePolicies: vi.fn(),
    attachRolePolicy: vi.fn(),
    detachRolePolicy: vi.fn(),
    listUsers: mocks.listUsers,
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
    listOrgUnits: mocks.listOrgUnits,
    getOrgUnit: mocks.getOrgUnit,
    createOrgUnit: vi.fn(),
    updateOrgUnit: mocks.updateOrgUnit,
    deleteOrgUnit: mocks.deleteOrgUnit,
    listOrgUnitUsers: mocks.listOrgUnitUsers,
    moveUserToOrgUnit: vi.fn(),
    listOrgUnitPolicies: mocks.listOrgUnitPolicies,
    attachOrgUnitPolicy: mocks.attachOrgUnitPolicy,
    detachOrgUnitPolicy: vi.fn(),
    getUserManager: mocks.getUserManager,
    setUserManager: mocks.setUserManager,
    clearUserManager: vi.fn(),
    listUserDirectReports: mocks.listUserDirectReports,
    getOrgChart: mocks.getOrgChart,
  } as unknown as ControlPlaneClient;
}

async function selectEngineeringOu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText('Engineering'));
}

describe('OrganizationWorkspace — manager not_found', () => {
  it('keeps the selected user out of the manager picker and still loads direct reports', async () => {
    const user = userEvent.setup();
    mocks.getUserManager.mockRejectedValue({ code: 'not_found', message: 'no manager' });
    render(<OrganizationWorkspace client={makeClient()} />);

    await selectEngineeringOu(user);
    await user.click(await screen.findByRole('button', { name: 'Manager' }));
    await user.selectOptions(await screen.findByLabelText('Select User'), 'user-a');

    await screen.findByText('No manager');

    // Bug #1 regression: the subject user must not be offered as their own manager.
    const setManagerSelect = screen.getByLabelText('Set Manager');
    expect(within(setManagerSelect).queryByRole('option', { name: 'user-a' })).toBeNull();
    expect(within(setManagerSelect).getByRole('option', { name: 'user-b' })).toBeInTheDocument();

    // Bug #2 regression: a manager-less user can still have direct reports.
    expect(mocks.listUserDirectReports).toHaveBeenCalledWith('user-a', { recursive: false });
    expect(await screen.findByText('report-1')).toBeInTheDocument();
  });
});

describe('OrganizationWorkspace — policy attach', () => {
  it('attaches a policy with enforced=true when the enforced toggle is checked', async () => {
    const user = userEvent.setup();
    render(<OrganizationWorkspace client={makeClient()} />);

    await selectEngineeringOu(user);
    await user.click(await screen.findByRole('button', { name: 'Policies' }));

    await user.click(await screen.findByLabelText('Enforced'));
    await user.selectOptions(screen.getByRole('combobox'), 'pol-1');

    expect(mocks.attachOrgUnitPolicy).toHaveBeenCalledWith('ou-1', 'pol-1', { enforced: true });
  });
});

describe('OrganizationWorkspace — error handling', () => {
  it('explains an organization cycle when setting a manager fails', async () => {
    const user = userEvent.setup();
    mocks.setUserManager.mockRejectedValue({ code: 'invalid_org_cycle', message: 'cycle' });
    render(<OrganizationWorkspace client={makeClient()} />);

    await selectEngineeringOu(user);
    await user.click(await screen.findByRole('button', { name: 'Manager' }));
    await user.selectOptions(await screen.findByLabelText('Select User'), 'user-a');
    await user.selectOptions(await screen.findByLabelText('Set Manager'), 'user-b');

    expect(await screen.findByText(/reporting chain cycle/)).toBeInTheDocument();
  });

  it('explains why a non-empty OU cannot be deleted', async () => {
    const user = userEvent.setup();
    mocks.deleteOrgUnit.mockRejectedValue({ code: 'ou_not_empty', message: 'not empty' });
    render(<OrganizationWorkspace client={makeClient()} />);

    await selectEngineeringOu(user);
    await user.click(await screen.findByRole('button', { name: /Delete/ }));
    await user.click(await screen.findByRole('button', { name: 'Confirm Delete' }));

    expect(await screen.findByText(/still has child OUs/)).toBeInTheDocument();
  });

  it('surfaces an organization cycle error on the edit form when updating an OU fails', async () => {
    const user = userEvent.setup();
    mocks.updateOrgUnit.mockRejectedValue({ code: 'invalid_org_cycle', message: 'cycle' });
    render(<OrganizationWorkspace client={makeClient()} />);

    await selectEngineeringOu(user);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/organization cycle/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.updateOrgUnit).toHaveBeenCalled());
  });
});
