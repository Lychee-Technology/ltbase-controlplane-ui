import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationChart } from './OrganizationChart';
import type { ControlPlaneClient } from '../api/controlPlaneClient';

const mocks = vi.hoisted(() => ({
  getOrgChart: vi.fn<() => Promise<unknown>>(),
}));

const samplePayload = {
  data: {
    root_ou_id: 'ou-rnd',
    org_units: [
      { ou_id: 'ou-rnd', name: 'R&D', parent_ou_id: '', ou_path: '/ou-rnd', block_inheritance: false, created_at: 1, updated_at: 2 },
      { ou_id: 'ou-eng', name: 'Engineering', parent_ou_id: 'ou-rnd', ou_path: '/ou-rnd/ou-eng', block_inheritance: false, created_at: 3, updated_at: 4 },
    ],
    users: [
      { user_id: 'user-alice', provider: 'google', issuer: '', external_sub: '', primary_ou_id: 'ou-eng', report_to_user_id: '', created_at: 1, updated_at: 2, last_login_at: 3 },
    ],
    policy_attachments: [
      { ou_id: 'ou-rnd', policy_id: 'pol-1', enforced: true, created_at: 1, updated_at: 2 },
    ],
  },
};

const rootOuOptions = [
  { ouId: 'ou-rnd', name: 'R&D' },
  { ouId: 'ou-sales', name: 'Sales' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgChart.mockResolvedValue(samplePayload);
});

function makeClient(): ControlPlaneClient {
  return { getOrgChart: mocks.getOrgChart } as unknown as ControlPlaneClient;
}

describe('OrganizationChart', () => {
  it('shows sign-in message when client is null', () => {
    render(
      <OrganizationChart
        client={null}
        rootOuOptions={[]}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sign in to a stack/)).toBeInTheDocument();
  });

  it('loads chart data on mount and renders OU nodes', async () => {
    const client = makeClient();
    const { container } = render(
      <OrganizationChart
        client={client}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    await waitFor(() => expect(mocks.getOrgChart).toHaveBeenCalled());

    const nodeNames = container.querySelectorAll('.org-chart-node-name');
    const names = Array.from(nodeNames).map((el) => el.textContent);
    expect(names).toContain('R&D');
    expect(names).toContain('Engineering');
  });

  it('calls onSelectOu when an OU node card is clicked', async () => {
    const user = userEvent.setup();
    const onSelectOu = vi.fn();
    const { container } = render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={onSelectOu}
        onSelectUser={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.getOrgChart).toHaveBeenCalled();
    });

    const nodeCard = container.querySelector('.org-chart-node-card');
    expect(nodeCard).not.toBeNull();
    await user.click(nodeCard!);
    expect(onSelectOu).toHaveBeenCalledWith('ou-rnd');
  });

  it('shows user chips when show users toggle is enabled', async () => {
    const user = userEvent.setup();
    render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    expect(screen.queryByText('user-alice')).toBeNull();

    await user.click(screen.getByLabelText('Show users'));

    await waitFor(() => {
      expect(mocks.getOrgChart).toHaveBeenCalledWith(
        expect.objectContaining({ include_users: true }),
      );
    });
  });

  it('shows policy chips when show policies toggle is enabled', async () => {
    const user = userEvent.setup();
    render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Show policy attachments'));

    await waitFor(() => {
      expect(mocks.getOrgChart).toHaveBeenCalledWith(
        expect.objectContaining({ include_policies: true }),
      );
    });
  });

  it('calls onSelectUser when a user chip is clicked', async () => {
    const user = userEvent.setup();
    const onSelectUser = vi.fn();

    const payloadWithUsers = {
      data: {
        root_ou_id: 'ou-rnd',
        org_units: [{ ou_id: 'ou-rnd', name: 'R&D', parent_ou_id: '', ou_path: '/ou-rnd', block_inheritance: false, created_at: 1, updated_at: 2 }],
        users: [{ user_id: 'user-alice', provider: 'google', issuer: '', external_sub: '', primary_ou_id: 'ou-rnd', report_to_user_id: '', created_at: 1, updated_at: 2, last_login_at: 3 }],
        policy_attachments: [],
      },
    };

    mocks.getOrgChart.mockResolvedValue(payloadWithUsers);

    render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={onSelectUser}
      />,
    );

    await user.click(screen.getByLabelText('Show users'));

    await waitFor(() => {
      expect(screen.getByText('user-alice')).toBeInTheDocument();
    });

    await user.click(screen.getByText('user-alice'));
    expect(onSelectUser).toHaveBeenCalledWith('user-alice');
  });

  it('selects a root OU and passes it to getOrgChart', async () => {
    const user = userEvent.setup();
    render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    await waitFor(() => expect(mocks.getOrgChart).toHaveBeenCalled());

    await user.selectOptions(
      screen.getByRole('combobox'),
      'ou-rnd',
    );

    await waitFor(() => {
      expect(mocks.getOrgChart).toHaveBeenCalledWith(
        expect.objectContaining({ root_ou_id: 'ou-rnd' }),
      );
    });
  });

  it('shows error state when fetch fails', async () => {
    mocks.getOrgChart.mockRejectedValue({ code: 'test_error', message: 'fetch failed' });
    render(
      <OrganizationChart
        client={makeClient()}
        rootOuOptions={rootOuOptions}
        onSelectOu={vi.fn()}
        onSelectUser={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/fetch failed/)).toBeInTheDocument();
    });
  });
});
