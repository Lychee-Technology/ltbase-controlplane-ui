import { render, screen } from '@testing-library/react';
import { SchemaWorkspace } from './SchemaWorkspace';

describe('SchemaWorkspace', () => {
  it('shows AI-assisted and manual schema authoring entry points', () => {
    render(<SchemaWorkspace clientReady />);

    expect(screen.getByText('Runtime Schemas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create with AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create manually' })).toBeInTheDocument();
    expect(screen.getByText('expense_claim')).toBeInTheDocument();
  });
});
