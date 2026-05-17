import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultOutputPath = path.resolve(__dirname, '..', 'public', 'ltbase-controlplane.config.json');

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

  return parsed;
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
