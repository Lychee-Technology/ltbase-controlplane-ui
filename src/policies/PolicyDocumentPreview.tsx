import { useState } from 'react';
import { formatPolicyDocument } from './policyData';

export function PolicyDocumentPreview({ document }: { document: unknown }) {
  const [showRaw, setShowRaw] = useState(false);
  const formatted = formatPolicyDocument(document);

  if (!formatted) {
    return <p className="muted">No document</p>;
  }

  const statements = extractStatements(document);

  return (
    <div>
      <div className="panel-heading spaced-below">
        <div>
          <p className="eyebrow">Document</p>
          <h3>Policy Document</h3>
        </div>
        <button className="button ghost" type="button" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? 'Statements' : 'Raw JSON'}
        </button>
      </div>
      {showRaw ? (
        <pre className="policy-json">{formatted}</pre>
      ) : (
        <div>
          {statements.length === 0 && <p className="muted">No statements in this policy document.</p>}
          {statements.map((stmt, idx) => (
            <div key={idx} className="statement-card">
              <div className="statement-header">
                <span className={`statement-badge badge-${stmt.effect}`}>{String(stmt.effect ?? '')}</span>
                <span className="kv-mono">{Array.isArray(stmt.ops) ? (stmt.ops as string[]).join(', ') : String(stmt.ops ?? '')}</span>
                <span>on</span>
                <strong>{String(stmt.schema ?? '—')}</strong>
              </div>
              {!!stmt.selector && renderSelector(stmt.selector)}
              {!!stmt.condition && (
                <details className="statement-details">
                  <summary>Condition</summary>
                  <pre className="policy-json policy-json-compact">{JSON.stringify(stmt.condition, null, 2)}</pre>
                </details>
              )}
              {!!stmt.outcome && (
                <details className="statement-details">
                  <summary>Outcome</summary>
                  <pre className="policy-json policy-json-compact">{JSON.stringify(stmt.outcome, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderSelector(selector: unknown) {
  const s = selector as Record<string, unknown>;
  const parts: string[] = [];
  if (Array.isArray(s.resource_id) && s.resource_id.length > 0) {
    parts.push(`resource_id: [${(s.resource_id as string[]).join(', ')}]`);
  }
  if (s.filter && typeof s.filter === 'object') {
    parts.push('filter specified');
  }
  if (parts.length === 0) {
    return null;
  }
  return <p className="muted statement-scope">Scope: {parts.join(', ')}</p>;
}

function extractStatements(document: unknown): Record<string, unknown>[] {
  if (!document || typeof document !== 'object') {
    return [];
  }
  const doc = document as Record<string, unknown>;
  if (Array.isArray(doc.statements)) {
    return doc.statements as Record<string, unknown>[];
  }
  return [];
}
