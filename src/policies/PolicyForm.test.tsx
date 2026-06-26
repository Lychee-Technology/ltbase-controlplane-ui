import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PolicyForm } from './PolicyForm';

describe('PolicyForm', () => {
  it('shows a statement-shape warning but still allows submit', async () => {
    const onSave = vi.fn();
    render(<PolicyForm mode="create" saving={false} onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText('e.g. Sales Read Policy'), 'My Policy');

    // A syntactically valid but shape-invalid document (no statements array).
    fireEvent.change(screen.getByLabelText('Policy document JSON'), {
      target: { value: '{ "foo": 1 }' },
    });

    expect(screen.getByText(/Statement warnings/i)).toBeInTheDocument();

    const createButton = screen.getByRole('button', { name: 'Create' });
    expect(createButton).toBeEnabled();

    await userEvent.click(createButton);
    expect(onSave).toHaveBeenCalledWith({
      name: 'My Policy',
      description: '',
      policyDocument: { foo: 1 },
    });
  });

  it('blocks submit when the document is not valid JSON', async () => {
    const onSave = vi.fn();
    render(<PolicyForm mode="create" saving={false} onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText('e.g. Sales Read Policy'), 'My Policy');

    fireEvent.change(screen.getByLabelText('Policy document JSON'), {
      target: { value: '{ bad json' },
    });

    expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(screen.queryByText(/Statement warnings/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
