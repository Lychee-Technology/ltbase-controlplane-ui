import { useEffect, useState } from 'react';
import type { ControlPlaneClient } from '../api/controlPlaneClient';
import { formatControlPlaneError } from '../types';
import { parseWorkflowList, type WorkflowSummary } from './workflowData';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: WorkflowSummary[] };

export function WorkflowWorkspace({ client }: { client: ControlPlaneClient | null }) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [loadTrigger, setLoadTrigger] = useState(0);

  useEffect(() => {
    if (!client) {
      setState({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });

    void (async () => {
      try {
        const payload = await client.listWorkflows();
        if (cancelled) { return; }
        const items = parseWorkflowList(payload);
        setState({ kind: 'ready', items });
      } catch (error: unknown) {
        if (cancelled) { return; }
        setState({ kind: 'error', message: formatControlPlaneError(error) });
      }
    })();

    return () => { cancelled = true; };
  }, [client, loadTrigger]);

  if (!client) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Runtime workflow</p>
            <h2>Workflow Summaries</h2>
          </div>
        </div>
        <p className="muted">Sign in to a stack to load workflow summaries.</p>
      </section>
    );
  }

  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Runtime workflow</p>
            <h2>Workflow Summaries</h2>
          </div>
        </div>
        <p className="muted">Loading workflow summaries…</p>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Runtime workflow</p>
            <h2>Workflow Summaries</h2>
          </div>
        </div>
        <p className="error">{state.message}</p>
        <button
          className="button ghost spaced-above"
          type="button"
          onClick={() => setLoadTrigger((n) => n + 1)}
        >
          Retry
        </button>
      </section>
    );
  }

  const { items } = state;

  if (items.length === 0) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Runtime workflow</p>
            <h2>Workflow Summaries</h2>
          </div>
        </div>
        <p className="muted">
          No workflow definitions found. Set{' '}
          <code>LTBASE_LOCAL_TESTING_WORKFLOW_DEFINITION_PATHS</code> or add
          standard workflow definitions, then reload.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Runtime workflow</p>
          <h2>Workflow Summaries</h2>
        </div>
      </div>
      <p className="muted spaced-below">
        Workflow definitions loaded from the local testing environment. This is
        a diagnostic view — not critical for production.
      </p>
      <table className="policy-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Active Version</th>
            <th>Referenced Tools</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>
                <span className="pill">{item.activeVersion || '—'}</span>
              </td>
              <td>
                {item.referencedTools.length > 0
                  ? item.referencedTools.join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
