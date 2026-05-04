import { describe, expect, it } from 'vitest';
import { draftStorageKey, loadDraft, saveDraft } from './drafts';

describe('draft storage', () => {
  it('scopes keys by user, stack, and resource type', () => {
    expect(draftStorageKey('Admin@Example.com', 'Prod', 'Capabilities')).toBe(
      'ltbase.controlplane.draft:admin%40example.com:prod:capabilities',
    );
  });

  it('round-trips a local draft record', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };

    saveDraft(
      adapter,
      {
        userKey: 'admin',
        stackKey: 'prod',
        resourceType: 'capabilities',
        value: { capabilities: [] },
      },
      new Date('2026-05-04T12:00:00.000Z'),
    );

    expect(loadDraft(adapter, 'admin', 'prod', 'capabilities')).toEqual({
      userKey: 'admin',
      stackKey: 'prod',
      resourceType: 'capabilities',
      value: { capabilities: [] },
      updatedAt: '2026-05-04T12:00:00.000Z',
    });
  });
});
