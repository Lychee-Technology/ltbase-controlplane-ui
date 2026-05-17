export function WorkflowWorkspace({ clientReady }: { clientReady: boolean }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Runtime workflow</p>
          <h2>Workflow Authoring</h2>
        </div>
      </div>
      <p className="muted">
        Create the expense reimbursement workflow manually or from a prompt, then adjust the manager approval threshold.
      </p>
      <div className="panel-actions">
        <button className="button primary" type="button" disabled={!clientReady}>
          Generate with AI
        </button>
        <button className="button ghost" type="button" disabled={!clientReady}>
          Create manually
        </button>
      </div>
      <div className="panel-section">
        <p className="eyebrow">Manager approval threshold</p>
        <strong>Change from &gt;1000 to &gt;500</strong>
      </div>
    </section>
  );
}
