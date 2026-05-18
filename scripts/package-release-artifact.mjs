import { cp, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const releaseDir = path.join(distDir, 'release');
const artifactName = 'ltbase-controlplane-ui.tar.gz';
const artifactPath = path.join(releaseDir, artifactName);
const runtimeConfigName = 'ltbase-controlplane.config.json';

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await pathExists(path.join(distDir, 'index.html')))) {
    throw new Error('dist/index.html is missing; run the build first');
  }

  if (!(await pathExists(path.join(distDir, '_redirects')))) {
    throw new Error('dist/_redirects is missing from the built site');
  }

  const stagingRoot = await mkdtemp(path.join(os.tmpdir(), 'ltbase-controlplane-ui-'));
  const stagingDir = path.join(stagingRoot, 'site');

  try {
    await cp(distDir, stagingDir, {
      recursive: true,
      filter: (source) => path.basename(source) !== runtimeConfigName && path.basename(source) !== 'release',
    });

    await mkdir(releaseDir, { recursive: true });
    await rm(artifactPath, { force: true });

    await execFileAsync('tar', ['-czf', artifactPath, '-C', stagingDir, '.']);
    process.stdout.write(`${artifactPath}\n`);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
