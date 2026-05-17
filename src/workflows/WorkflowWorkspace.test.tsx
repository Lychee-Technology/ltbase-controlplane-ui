import { render, screen } from '@testing-library/react';
import { WorkflowWorkspace } from './WorkflowWorkspace';

describe('WorkflowWorkspace', () => {
  it('shows workflow authoring and threshold editing entry points', () => {
    render(<WorkflowWorkspace clientReady />);

    expect(screen.getByText('Workflow Authoring')).toBeInTheDocument();
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
    expect(screen.getByText('Manager approval threshold')).toBeInTheDocument();
    expect(screen.getByText('Change from >1000 to >500')).toBeInTheDocument();
  });
});
