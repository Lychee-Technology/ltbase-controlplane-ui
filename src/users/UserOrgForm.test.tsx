import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserOrgForm } from './UserOrgForm';
import type { AuthUser, OuOption } from './userData';

const sampleUser: AuthUser = {
  userId: 'user-1',
  provider: 'google',
  issuer: 'issuer-1',
  externalSub: 'sub-1',
  referralCode: 'REF1',
  primaryOuId: 'ou-root',
  reportToUserId: 'user-mgr',
  createdAt: 1,
  updatedAt: 2,
  lastLoginAt: 3,
};

const ouOptions: OuOption[] = [
  { ouId: 'ou-root', name: 'Root' },
  { ouId: 'ou-child', name: 'Child Team' },
];

const managerOptions = [
  { userId: 'user-mgr' },
  { userId: 'user-3' },
];

describe('UserOrgForm', () => {
  it('renders read-only provider identity fields', () => {
    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const providerInput = screen.getByLabelText('Provider') as HTMLInputElement;
    expect(providerInput).toBeDisabled();
    expect(providerInput).toHaveValue('google');

    const issuerInput = screen.getByLabelText('Issuer') as HTMLInputElement;
    expect(issuerInput).toBeDisabled();
    expect(issuerInput).toHaveValue('issuer-1');

    const extSubInput = screen.getByLabelText('External Sub') as HTMLInputElement;
    expect(extSubInput).toBeDisabled();
    expect(extSubInput).toHaveValue('sub-1');
  });

  it('selects primary OU and submits', async () => {
    const onSave = vi.fn();

    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const comboboxes = screen.getAllByRole('combobox');
    const ouSelect = comboboxes[0];
    await userEvent.selectOptions(ouSelect, 'ou-child');
    await userEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({ primaryOuId: 'ou-child', reportToUserId: 'user-mgr' });
  });

  it('clears report-to user and submits', async () => {
    const onSave = vi.fn();

    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const comboboxes = screen.getAllByRole('combobox');
    const managerSelect = comboboxes[1];
    await userEvent.selectOptions(managerSelect, '');
    await userEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith({ primaryOuId: 'ou-root', reportToUserId: '' });
  });

  it('disables controls while saving', () => {
    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={true}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Saving…')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();

    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={false}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('excludes current user from manager options implicitly via options prop', () => {
    render(
      <UserOrgForm
        user={sampleUser}
        ouOptions={ouOptions}
        managerOptions={managerOptions}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const comboboxes = screen.getAllByRole('combobox');
    const managerSelect = comboboxes[1] as HTMLSelectElement;
    const optionValues = Array.from(managerSelect.options).map((o) => o.value);
    expect(optionValues).not.toContain('user-1');
  });
});
