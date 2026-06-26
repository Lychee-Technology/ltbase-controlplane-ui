import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BindingPolicyForm } from './BindingPolicyForm';

describe('BindingPolicyForm', () => {
  it('renders create mode with defaults', () => {
    render(<BindingPolicyForm mode="create" saving={false} onSave={vi.fn()} onCancel={() => {}} />);

    expect(screen.getByText('Create Binding Policy')).toBeInTheDocument();
    expect(screen.getByLabelText('Enabled')).toBeChecked();
    expect(screen.getByLabelText('Binding policy rules JSON')).toHaveValue('[]');
  });

  it('submits form with parsed values in create mode', async () => {
    const onSave = vi.fn();
    render(<BindingPolicyForm mode="create" saving={false} onSave={onSave} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Binding policy rules JSON'), {
      target: { value: '[{"l":"and","c":[]}]' },
    });

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toBeEnabled();

    await userEvent.click(createButton);
    expect(onSave).toHaveBeenCalledWith({
      enabled: true,
      priority: 0,
      rules: [{ l: 'and', c: [] }],
    });
  });

  it('blocks submit when rules are not valid JSON', async () => {
    const onSave = vi.fn();
    render(<BindingPolicyForm mode="create" saving={false} onSave={onSave} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Binding policy rules JSON'), {
      target: { value: '{ bad json' },
    });

    expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('blocks submit when rules are empty', async () => {
    const onSave = vi.fn();
    render(<BindingPolicyForm mode="create" saving={false} onSave={onSave} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Binding policy rules JSON'), {
      target: { value: '' },
    });

    expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('renders edit mode with existing values', () => {
    const policy = {
      policyId: '0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08',
      enabled: false,
      priority: 5,
      slug: 'bind.test',
      externalKey: 'bind-test-v1',
      rules: [{ l: 'or', c: [] }],
      createdAt: 0,
      updatedAt: 0,
    };

    render(<BindingPolicyForm mode="edit" policy={policy} saving={false} onSave={vi.fn()} onCancel={() => {}} />);

    expect(screen.getByText('Edit Binding Policy')).toBeInTheDocument();
    expect(screen.getByLabelText('Enabled')).not.toBeChecked();
    expect(screen.getByText('0192e0a1-9e5f-7d2c-9f30-cc03dd04ee08')).toBeInTheDocument();
    expect(screen.getAllByText('bind.test').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('bind-test-v1')).toBeInTheDocument();
    expect(screen.getByLabelText('Binding policy rules JSON')).toHaveValue('[\n  {\n    "l": "or",\n    "c": []\n  }\n]');
  });

  it('shows priority error for non-integer input', async () => {
    render(<BindingPolicyForm mode="create" saving={false} onSave={vi.fn()} onCancel={() => {}} />);

    const priorityInput = screen.getByPlaceholderText('0');
    const rulesTextarea = screen.getByLabelText('Binding policy rules JSON');

    fireEvent.change(rulesTextarea, { target: { value: '[]' } });
    fireEvent.change(priorityInput, { target: { value: 'abc' } });

    expect(screen.getByText(/non-negative integer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('shows priority error for negative number', async () => {
    render(<BindingPolicyForm mode="create" saving={false} onSave={vi.fn()} onCancel={() => {}} />);

    const priorityInput = screen.getByPlaceholderText('0');
    const rulesTextarea = screen.getByLabelText('Binding policy rules JSON');

    fireEvent.change(rulesTextarea, { target: { value: '[]' } });
    fireEvent.change(priorityInput, { target: { value: '-1' } });

    expect(screen.getByText(/non-negative integer/i)).toBeInTheDocument();
  });
});
