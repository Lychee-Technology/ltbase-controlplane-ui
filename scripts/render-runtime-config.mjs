import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputPath = path.resolve(__dirname, '..', 'public', 'ltbase-controlplane.config.json');

const REQUIRED_STACK_FIELDS = [
  'key',
  'label',
  'projectId',
  'authBaseUrl',
  'controlPlaneBaseUrl',
  'apiBaseUrl',
  'oidcClientId',
  'redirectUri',
];

const URL_FIELDS = new Set(['authBaseUrl', 'controlPlaneBaseUrl', 'apiBaseUrl', 'redirectUri', 'supabaseUrl']);

const SUPPORTED_PROVIDER_TYPES = new Set(['firebase', 'supabase']);

export function parseRuntimeConfigEnv(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    throw new Error('CONTROLPLANE_UI_STACK_CONFIG repo variable is not set');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error('CONTROLPLANE_UI_STACK_CONFIG must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.stacks) || parsed.stacks.length === 0) {
    throw new Error('CONTROLPLANE_UI_STACK_CONFIG must contain at least one stack');
  }

  const keys = new Set();
  for (let i = 0; i < parsed.stacks.length; i++) {
    const stack = parsed.stacks[i];
    const label = `stack[${i}]`;
    validateStackFields(stack, label);
    if (keys.has(stack.key)) {
      throw new Error(`${label}: duplicate stack key "${stack.key}"`);
    }
    keys.add(stack.key);
    validateAuthProviders(stack.authProviders, stack.key, `${label}.authProviders`);
  }

  return parsed;
}

function validateStackFields(stack, label) {
  if (!stack || typeof stack !== 'object' || Array.isArray(stack)) {
    throw new Error(`${label}: must be an object`);
  }

  for (const field of REQUIRED_STACK_FIELDS) {
    const value = stack[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${label}: field "${field}" is required`);
    }
    stack[field] = value.trim();
  }

  for (const field of URL_FIELDS) {
    if (stack[field] !== undefined) {
      try {
        new URL(stack[field]);
      } catch {
        throw new Error(`${label}: field "${field}" must be a valid URL`);
      }
    }
  }

  if (!Array.isArray(stack.authProviders) || stack.authProviders.length === 0) {
    throw new Error(`${label}: field "authProviders" must be a non-empty array`);
  }
}

function validateAuthProviders(providers, stackKey, label) {
  const names = new Set();
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const plabel = `${label}[${i}]`;

    if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
      throw new Error(`${plabel}: must be an object`);
    }

    const type = provider.type;
    if (typeof type !== 'string' || !SUPPORTED_PROVIDER_TYPES.has(type)) {
      throw new Error(`${plabel}: unsupported or missing auth provider type "${type}"`);
    }

    const name = provider.name;
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`${plabel}: field "name" is required`);
    }
    if (names.has(name)) {
      throw new Error(`${plabel}: duplicate auth provider name "${name}" in stack "${stackKey}"`);
    }
    names.add(name);

    const plabel2 = provider.label;
    if (typeof plabel2 !== 'string' || plabel2.trim() === '') {
      throw new Error(`${plabel}: field "label" is required`);
    }

    if (type === 'firebase') {
      const fbId = provider.firebaseProjectId;
      if (typeof fbId !== 'string' || fbId.trim() === '') {
        throw new Error(`${plabel}: field "firebaseProjectId" is required`);
      }
      const fbKey = provider.firebaseApiKey;
      if (typeof fbKey !== 'string' || fbKey.trim() === '') {
        throw new Error(`${plabel}: field "firebaseApiKey" is required`);
      }
    }

    if (type === 'supabase') {
      const suUrl = provider.supabaseUrl;
      if (typeof suUrl !== 'string' || suUrl.trim() === '') {
        throw new Error(`${plabel}: field "supabaseUrl" is required`);
      }
      try {
        new URL(suUrl.trim());
      } catch {
        throw new Error(`${plabel}: field "supabaseUrl" must be a valid URL`);
      }
      const suKey = provider.supabaseAnonKey;
      if (typeof suKey !== 'string' || suKey.trim() === '') {
        throw new Error(`${plabel}: field "supabaseAnonKey" is required`);
      }
    }
  }
}

export async function renderRuntimeConfig(rawValue, outputPath = defaultOutputPath) {
  const parsed = parseRuntimeConfigEnv(rawValue);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return outputPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderRuntimeConfig(process.env.CONTROLPLANE_UI_STACK_CONFIG)
    .then((outputPath) => {
      process.stdout.write(`${outputPath}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
