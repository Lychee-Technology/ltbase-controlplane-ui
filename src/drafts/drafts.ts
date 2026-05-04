import type { DraftRecord } from '../types';

const PREFIX = 'ltbase.controlplane.draft';

export function draftStorageKey(userKey: string, stackKey: string, resourceType: string): string {
  return [PREFIX, encodeKey(userKey), encodeKey(stackKey), encodeKey(resourceType)].join(':');
}

export function saveDraft<T>(
  storage: Pick<Storage, 'setItem'>,
  draft: Omit<DraftRecord<T>, 'updatedAt'>,
  now: Date = new Date(),
): DraftRecord<T> {
  const record = { ...draft, updatedAt: now.toISOString() };
  storage.setItem(draftStorageKey(draft.userKey, draft.stackKey, draft.resourceType), JSON.stringify(record));
  return record;
}

export function loadDraft<T>(
  storage: Pick<Storage, 'getItem'>,
  userKey: string,
  stackKey: string,
  resourceType: string,
): DraftRecord<T> | null {
  const raw = storage.getItem(draftStorageKey(userKey, stackKey, resourceType));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as DraftRecord<T>;
}

export function clearDraft(
  storage: Pick<Storage, 'removeItem'>,
  userKey: string,
  stackKey: string,
  resourceType: string,
): void {
  storage.removeItem(draftStorageKey(userKey, stackKey, resourceType));
}

function encodeKey(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase());
}
