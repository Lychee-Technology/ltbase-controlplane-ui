import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRuntimeConfigEnv, renderRuntimeConfig } from './render-runtime-config.mjs';

function makeValidConfig(overrides = {}) {
  return JSON.stringify({
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
            type: 'firebase',
            name: 'firebase-google',
            label: 'Firebase Google',
            firebaseProjectId: 'ltbase-prod',
            firebaseApiKey: 'public-api-key',
          },
        ],
        ...overrides,
      },
    ],
  });
}

describe('parseRuntimeConfigEnv', () => {
  it('rejects missing env var', () => {
    expect(() => parseRuntimeConfigEnv('')).toThrow('CONTROLPLANE_UI_STACK_CONFIG repo variable is not set');
    expect(() => parseRuntimeConfigEnv(undefined)).toThrow('CONTROLPLANE_UI_STACK_CONFIG repo variable is not set');
    expect(() => parseRuntimeConfigEnv(null)).toThrow('CONTROLPLANE_UI_STACK_CONFIG repo variable is not set');
  });

  it('rejects invalid JSON', () => {
    expect(() => parseRuntimeConfigEnv('not-json')).toThrow('CONTROLPLANE_UI_STACK_CONFIG must be valid JSON');
    expect(() => parseRuntimeConfigEnv('{broken')).toThrow('CONTROLPLANE_UI_STACK_CONFIG must be valid JSON');
  });

  it('rejects empty stacks array', () => {
    expect(() => parseRuntimeConfigEnv('{"stacks":[]}')).toThrow(
      'CONTROLPLANE_UI_STACK_CONFIG must contain at least one stack',
    );
  });

  it('rejects missing stacks key', () => {
    expect(() => parseRuntimeConfigEnv('{}')).toThrow(
      'CONTROLPLANE_UI_STACK_CONFIG must contain at least one stack',
    );
  });

  it('rejects null value', () => {
    expect(() => parseRuntimeConfigEnv('null')).toThrow(
      'CONTROLPLANE_UI_STACK_CONFIG must contain at least one stack',
    );
  });

  it('rejects missing required stack field', () => {
    const fields = ['key', 'label', 'projectId', 'authBaseUrl', 'controlPlaneBaseUrl', 'apiBaseUrl', 'oidcClientId', 'redirectUri'];
    for (const field of fields) {
      const config = JSON.parse(makeValidConfig());
      delete config.stacks[0][field];
      expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
        `stack[0]: field "${field}" is required`,
      );
    }
  });

  it('rejects empty string for required field', () => {
    const fields = ['key', 'label', 'projectId', 'authBaseUrl', 'controlPlaneBaseUrl', 'apiBaseUrl', 'oidcClientId', 'redirectUri'];
    for (const field of fields) {
      const config = JSON.parse(makeValidConfig());
      config.stacks[0][field] = '   ';
      expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
        `stack[0]: field "${field}" is required`,
      );
    }
  });

  it('rejects invalid URL fields', () => {
    const urlFields = ['authBaseUrl', 'controlPlaneBaseUrl', 'apiBaseUrl', 'redirectUri'];
    for (const field of urlFields) {
      const config = JSON.parse(makeValidConfig());
      config.stacks[0][field] = 'not-a-url';
      expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
        `stack[0]: field "${field}" must be a valid URL`,
      );
    }
  });

  it('rejects missing authProviders', () => {
    const config = JSON.parse(makeValidConfig());
    delete config.stacks[0].authProviders;
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
      'stack[0]: field "authProviders" must be a non-empty array',
    );
  });

  it('rejects empty authProviders array', () => {
    const config = JSON.parse(makeValidConfig({ authProviders: [] }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
      'stack[0]: field "authProviders" must be a non-empty array',
    );
  });

  it('rejects unsupported auth provider type', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'google', name: 'google', label: 'Google' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
      'unsupported or missing auth provider type',
    );
  });

  it('rejects missing auth provider name', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'firebase', label: 'FB' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
      'field "name" is required',
    );
  });

  it('rejects missing auth provider label', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'firebase', name: 'fb' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow(
      'field "label" is required',
    );
  });

  it('rejects duplicate stack keys', () => {
    const config = {
      stacks: [
        { key: 'prod', label: 'Production', projectId: 'p1', authBaseUrl: 'https://auth.example.com', controlPlaneBaseUrl: 'https://ctl.example.com', apiBaseUrl: 'https://api.example.com', oidcClientId: 'cli', redirectUri: 'https://admin.example.com/cb', authProviders: [{ type: 'firebase', name: 'fb', label: 'FB', firebaseProjectId: 'fb', firebaseApiKey: 'k' }] },
        { key: 'prod', label: 'Prod 2', projectId: 'p2', authBaseUrl: 'https://auth2.example.com', controlPlaneBaseUrl: 'https://ctl2.example.com', apiBaseUrl: 'https://api2.example.com', oidcClientId: 'cli', redirectUri: 'https://admin.example.com/cb', authProviders: [{ type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'https://su.co', supabaseAnonKey: 'k' }] },
      ],
    };
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('duplicate stack key "prod"');
  });

  it('rejects duplicate auth provider names in same stack', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [
        { type: 'firebase', name: 'fb', label: 'FB', firebaseProjectId: 'fb', firebaseApiKey: 'k' },
        { type: 'supabase', name: 'fb', label: 'SU', supabaseUrl: 'https://su.co', supabaseAnonKey: 'k' },
      ],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('duplicate auth provider name "fb"');
  });

  it('rejects firebase provider missing firebaseProjectId', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'firebase', name: 'fb', label: 'FB', firebaseApiKey: 'k' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('field "firebaseProjectId" is required');
  });

  it('rejects firebase provider missing firebaseApiKey', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'firebase', name: 'fb', label: 'FB', firebaseProjectId: 'fb' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('field "firebaseApiKey" is required');
  });

  it('rejects supabase provider missing supabaseUrl', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'supabase', name: 'su', label: 'SU', supabaseAnonKey: 'k' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('field "supabaseUrl" is required');
  });

  it('rejects supabase provider with invalid supabaseUrl', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'not-url', supabaseAnonKey: 'k' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('field "supabaseUrl" must be a valid URL');
  });

  it('rejects supabase provider missing supabaseAnonKey', () => {
    const config = JSON.parse(makeValidConfig({
      authProviders: [{ type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'https://su.co' }],
    }));
    expect(() => parseRuntimeConfigEnv(JSON.stringify(config))).toThrow('field "supabaseAnonKey" is required');
  });

  it('accepts valid config with firebase provider', () => {
    const config = makeValidConfig();
    const result = parseRuntimeConfigEnv(config);
    expect(result.stacks).toHaveLength(1);
    expect(result.stacks[0].key).toBe('prod');
    expect(result.stacks[0].authProviders[0].type).toBe('firebase');
  });

  it('accepts valid config with supabase provider', () => {
    const config = makeValidConfig({
      authProviders: [{ type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'https://su.co', supabaseAnonKey: 'key' }],
    });
    const result = parseRuntimeConfigEnv(config);
    expect(result.stacks).toHaveLength(1);
    expect(result.stacks[0].authProviders[0].type).toBe('supabase');
  });

  it('accepts valid config with multiple stacks and providers', () => {
    const config = {
      stacks: [
        {
          key: 'prod', label: 'Production', projectId: 'p1',
          authBaseUrl: 'https://auth.example.com', controlPlaneBaseUrl: 'https://ctl.example.com',
          apiBaseUrl: 'https://api.example.com', oidcClientId: 'cli', redirectUri: 'https://admin.example.com/cb',
          authProviders: [
            { type: 'firebase', name: 'fb', label: 'FB', firebaseProjectId: 'fb', firebaseApiKey: 'k' },
            { type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'https://su.co', supabaseAnonKey: 'k' },
          ],
        },
        {
          key: 'staging', label: 'Staging', projectId: 'p2',
          authBaseUrl: 'https://auth-staging.example.com', controlPlaneBaseUrl: 'https://ctl-staging.example.com',
          apiBaseUrl: 'https://api-staging.example.com', oidcClientId: 'cli', redirectUri: 'https://admin-staging.example.com/cb',
          authProviders: [
            { type: 'supabase', name: 'su', label: 'SU', supabaseUrl: 'https://su-staging.co', supabaseAnonKey: 'k' },
          ],
        },
      ],
    };
    const result = parseRuntimeConfigEnv(JSON.stringify(config));
    expect(result.stacks).toHaveLength(2);
    expect(result.stacks[0].key).toBe('prod');
    expect(result.stacks[1].key).toBe('staging');
  });

  it('trims whitespace from string fields', () => {
    const config = makeValidConfig({ key: '  prod  ', label: '  Production  ' });
    const result = parseRuntimeConfigEnv(config);
    expect(result.stacks[0].key).toBe('prod');
    expect(result.stacks[0].label).toBe('Production');
  });
});

describe('renderRuntimeConfig', () => {
  it('writes the runtime config artifact from repo variable JSON', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ltbase-controlplane-ui-'));
    const outputPath = path.join(tempDir, 'ltbase-controlplane.config.json');
    const rawValue = makeValidConfig({
      authProviders: [
        {
          type: 'supabase',
          name: 'supabase-google',
          label: 'Supabase Google',
          supabaseUrl: 'https://project.supabase.co',
          supabaseAnonKey: 'public-key',
        },
      ],
    });

    await renderRuntimeConfig(rawValue, outputPath);

    await expect(readFile(outputPath, 'utf8')).resolves.toContain('"redirectUri": "https://admin.example.com/auth/callback"');
    await expect(readFile(outputPath, 'utf8')).resolves.toContain('"name": "supabase-google"');
  });
});
