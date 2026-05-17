import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRuntimeConfigEnv, renderRuntimeConfig } from './render-runtime-config.mjs';

describe('renderRuntimeConfig', () => {
  it('writes the runtime config artifact from repo variable JSON', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ltbase-controlplane-ui-'));
    const outputPath = path.join(tempDir, 'ltbase-controlplane.config.json');
    const rawValue = JSON.stringify({
      stacks: [
        {
          key: 'prod',
          label: 'Production',
          projectId: 'project-prod',
          authBaseUrl: 'https://auth.example.com',
          controlPlaneBaseUrl: 'https://control.example.com',
          apiBaseUrl: 'https://api.example.com',
          oidcClientId: 'ltbase-controlplane-ui',
          redirectUri: 'https://admin.example.com/auth/callback',
          authProviders: [
            {
              type: 'supabase',
              name: 'supabase-google',
              label: 'Supabase Google',
              supabaseUrl: 'https://project.supabase.co',
              supabaseAnonKey: 'public-key',
            },
          ],
        },
      ],
    });

    await renderRuntimeConfig(rawValue, outputPath);

    await expect(readFile(outputPath, 'utf8')).resolves.toContain('"redirectUri": "https://admin.example.com/auth/callback"');
    await expect(readFile(outputPath, 'utf8')).resolves.toContain('"name": "supabase-google"');
  });

  it('rejects empty stack payloads', () => {
    expect(() => parseRuntimeConfigEnv('{"stacks":[]}')).toThrow(
      'CONTROLPLANE_UI_STACK_CONFIG must contain at least one stack',
    );
  });
});
