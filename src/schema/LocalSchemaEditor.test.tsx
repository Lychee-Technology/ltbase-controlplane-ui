import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildSchemaDownload, LocalSchemaEditor } from './LocalSchemaEditor';

describe('LocalSchemaEditor', () => {
  it('builds a JSON schema download blob', async () => {
    const download = buildSchemaDownload('{"type":"object"}', 'lead.json');

    expect(download.filename).toBe('lead.json');
    expect(download.blob.type).toBe('application/schema+json');
    expect(download.blob.size).toBe('{"type":"object"}'.length);
  });

  it('copies JSON without calling network APIs', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const fetchSpy = vi.spyOn(window, 'fetch');

    render(<LocalSchemaEditor />);
    await userEvent.click(screen.getByRole('button', { name: /copy json/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"type": "object"'));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
