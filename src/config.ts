import type { RuntimeConfig, StackConfig } from './types';

const CONFIG_URL = '/ltbase-controlplane.config.json';

export async function loadRuntimeConfig(fetchImpl: typeof fetch = fetch): Promise<RuntimeConfig> {
  const response = await fetchImpl(CONFIG_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`load runtime config failed: ${response.status}`);
  }
  const raw = (await response.json()) as unknown;
  return parseRuntimeConfig(raw);
}

export function parseRuntimeConfig(raw: unknown): RuntimeConfig {
  if (!isRecord(raw) || !Array.isArray(raw.stacks) || raw.stacks.length === 0) {
    throw new Error('runtime config requires at least one stack');
  }
  const stacks = raw.stacks.map(parseStackConfig);
  const keys = new Set<string>();
  for (const stack of stacks) {
    if (keys.has(stack.key)) {
      throw new Error(`duplicate stack key: ${stack.key}`);
    }
    keys.add(stack.key);
  }
  return { stacks };
}

function parseStackConfig(raw: unknown): StackConfig {
  if (!isRecord(raw)) {
    throw new Error('stack config must be an object');
  }
  return {
    key: requireString(raw, 'key'),
    label: requireString(raw, 'label'),
    authBaseUrl: requireURL(raw, 'authBaseUrl'),
    controlPlaneBaseUrl: requireURL(raw, 'controlPlaneBaseUrl'),
    apiBaseUrl: requireURL(raw, 'apiBaseUrl'),
    oidcClientId: requireString(raw, 'oidcClientId'),
    redirectUri: requireURL(raw, 'redirectUri'),
  };
}

function requireString(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`stack config field ${key} is required`);
  }
  return value.trim();
}

function requireURL(raw: Record<string, unknown>, key: string): string {
  const value = requireString(raw, key);
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`stack config field ${key} must be a URL`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
