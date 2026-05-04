import { Copy, Download } from 'lucide-react';
import { useMemo, useState } from 'react';

const defaultSchema = JSON.stringify(
  {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
  },
  null,
  2,
);

export function buildSchemaDownload(schemaText: string, filename = 'ltbase-schema.json'): { filename: string; blob: Blob } {
  return {
    filename,
    blob: new Blob([schemaText], { type: 'application/schema+json' }),
  };
}

export function LocalSchemaEditor() {
  const [schemaText, setSchemaText] = useState(defaultSchema);
  const [copied, setCopied] = useState(false);
  const validation = useMemo(() => validateJSON(schemaText), [schemaText]);

  async function copyJSON(): Promise<void> {
    await navigator.clipboard.writeText(schemaText);
    setCopied(true);
  }

  function downloadJSON(): void {
    const { filename, blob } = buildSchemaDownload(schemaText);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Local only</p>
          <h2>JSON Schema Editor</h2>
        </div>
        <div className="actions">
          <button type="button" className="button ghost" onClick={copyJSON} disabled={!validation.valid}>
            <Copy size={16} /> {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" className="button primary" onClick={downloadJSON} disabled={!validation.valid}>
            <Download size={16} /> Download
          </button>
        </div>
      </div>
      <p className="muted">
        This editor never applies schemas or updates the Control Plane schema registry. Commit downloaded files through the
        deployment repository under <code>customer-owned/schemas/</code>.
      </p>
      <textarea
        className="schema-textarea"
        value={schemaText}
        onChange={(event) => setSchemaText(event.target.value)}
        spellCheck={false}
        aria-label="JSON Schema text"
      />
      {!validation.valid && <p className="error">{validation.message}</p>}
    </section>
  );
}

function validateJSON(value: string): { valid: true } | { valid: false; message: string } {
  try {
    JSON.parse(value);
    return { valid: true };
  } catch (error) {
    return { valid: false, message: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}
