export function SchemaWorkspace({ clientReady }: { clientReady: boolean }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Runtime model</p>
          <h2>Runtime Schemas</h2>
        </div>
      </div>
      <p className="muted">
        Create and publish runtime schemas for the expense demo through AI assistance or manual editing.
      </p>
      <div className="panel-actions">
        <button className="button primary" type="button" disabled={!clientReady}>
          Create with AI
        </button>
        <button className="button ghost" type="button" disabled={!clientReady}>
          Create manually
        </button>
      </div>
      <div className="panel-section">
        <p className="eyebrow">Required schemas</p>
        <ul>
          <li>expense_claim</li>
          <li>expense_attachment</li>
          <li>expense_extraction_result</li>
        </ul>
      </div>
    </section>
  );
}
