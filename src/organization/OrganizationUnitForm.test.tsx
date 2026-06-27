import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationUnitForm } from './OrganizationUnitForm';
import type { AuthOrgUnit } from './organizationData';

const sampleUnit: AuthOrgUnit = {
  ouId: 'ou-child',
  name: 'Child Team',
  parentOuId: 'ou-root',
  ouPath: '/ou-root/ou-child',
  blockInheritance: true,
  createdAt: 3,
  updatedAt: 4,
};

const allUnits: AuthOrgUnit[] = [
  { ouId: 'ou-root', name: 'Root', parentOuId: '', ouPath: '/ou-root', blockInheritance: false, createdAt: 1, updatedAt: 2 },
  { ouId: 'ou-child', name: 'Child Team', parentOuId: 'ou-root', ouPath: '/ou-root/ou-child', blockInheritance: true, createdAt: 3, updatedAt: 4 },
];

const parentOptions = [allUnits[0]];

describe('OrganizationUnitForm create mode', () => {
  it('renders create form with OU ID field', () => {
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Create Organizational Unit')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ou-sales')).toBeInTheDocument();
  });

  it('disables Save when ouId is empty', () => {
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables Save when ouId is filled', async () => {
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText('ou-sales'), 'ou-sales');
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });

  it('calls onSave with form values', async () => {
    const onSave = vi.fn();
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText('ou-sales'), 'ou-sales');
    await userEvent.type(screen.getByPlaceholderText('Sales'), 'Sales Department');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        ouId: 'ou-sales',
        name: 'Sales Department',
        parentOuId: '',
        blockInheritance: false,
      });
    });
  });

  it('disables form controls while saving', () => {
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={true}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('ou-sales')).toBeDisabled();
    expect(screen.getByPlaceholderText('Sales')).toBeDisabled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <OrganizationUnitForm
        mode="create"
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('OrganizationUnitForm edit mode', () => {
  it('renders edit form without OU ID field', () => {
    render(
      <OrganizationUnitForm
        mode="edit"
        unit={sampleUnit}
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Edit Child Team')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('ou-sales')).not.toBeInTheDocument();
  });

  it('shows ou_path as read-only', () => {
    render(
      <OrganizationUnitForm
        mode="edit"
        unit={sampleUnit}
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const pathInput = screen.getByDisplayValue('/ou-root/ou-child');
    expect(pathInput).toBeDisabled();
    expect(pathInput).toHaveAttribute('readonly');
  });

  it('calls onSave with update values', async () => {
    const onSave = vi.fn();
    render(
      <OrganizationUnitForm
        mode="edit"
        unit={sampleUnit}
        allUnits={allUnits}
        parentOptions={parentOptions}
        saving={false}
        error=""
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Child Team',
        parentOuId: 'ou-root',
        blockInheritance: true,
      });
    });
  });
});
