import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoleForm } from './RoleForm';
import type { AuthRole } from './roleData';

const sampleRoles: AuthRole[] = [
  {
    roleId: 'role-admin-id',
    name: 'Admin',
    description: '',
    slug: 'role.admin',
    externalKey: 'rk-admin',
    parentRoleIds: [],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    roleId: 'role-viewer-id',
    name: 'Viewer',
    description: '',
    slug: 'role.viewer',
    externalKey: '',
    parentRoleIds: [],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    roleId: 'role-editor-id',
    name: 'Editor',
    description: '',
    slug: 'role.editor',
    externalKey: '',
    parentRoleIds: [],
    createdAt: 0,
    updatedAt: 0,
  },
];

describe('RoleForm', () => {
  it('renders create mode with empty fields', () => {
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Create Role')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Administrator')).toBeInTheDocument();
  });

  it('requires name before submit is enabled', () => {
    const onSave = vi.fn();
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const createBtn = screen.getByRole('button', { name: 'Create' });
    expect(createBtn).toBeDisabled();

    const nameInput = screen.getByPlaceholderText('e.g. Administrator');
    // Type needs the input to be enabled first - in create mode it should be
    expect(nameInput).toBeEnabled();
  });

  it('submits with name, description, and selected parent roles', async () => {
    const onSave = vi.fn();
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByPlaceholderText('e.g. Administrator');
    await userEvent.type(nameInput, 'Manager');

    const descInput = screen.getByPlaceholderText('What this role is for');
    await userEvent.type(descInput, 'Manages people');

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Manager',
      description: 'Manages people',
      parentRoleIds: ['role-admin-id'],
    });
  });

  it('does not submit when name is empty', async () => {
    const onSave = vi.fn();
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('filters parent roles by search text', async () => {
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search by name, slug, or ID…');
    await userEvent.type(searchInput, 'viewer');

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Editor')).not.toBeInTheDocument();
  });

  it('excludes current role from parent candidates in edit mode', () => {
    const adminRole = sampleRoles[0];
    render(
      <RoleForm
        mode="edit"
        role={adminRole}
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Edit Role')).toBeInTheDocument();

    const parentItems = document.querySelectorAll('.parent-role-item');
    const parentNames = Array.from(parentItems).map((el) => el.querySelector('strong')?.textContent);
    expect(parentNames).not.toContain('Admin');
    expect(parentNames).toContain('Viewer');
    expect(parentNames).toContain('Editor');
  });

  it('shows read-only role id, slug, external key in edit mode', () => {
    render(
      <RoleForm
        mode="edit"
        role={sampleRoles[0]}
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('role-admin-id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('role.admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rk-admin')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables inputs when saving', () => {
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={true}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('e.g. Administrator')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('filters by role_id in parent search', async () => {
    render(
      <RoleForm
        mode="create"
        allRoles={sampleRoles}
        saving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search by name, slug, or ID…');
    await userEvent.type(searchInput, 'role-viewer-id');

    await waitFor(() => {
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
});
