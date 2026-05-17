import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from './config';

describe('parseRuntimeConfig', () => {
  it('accepts valid stack config and normalizes URL slashes', () => {
    const config = parseRuntimeConfig({
      stacks: [
        {
          key: 'prod',
          label: 'Production',
          projectId: 'ltbase-prod',
          authBaseUrl: 'https://auth.example.com/',
          controlPlaneBaseUrl: 'https://control-plane.example.com/',
          apiBaseUrl: 'https://api.example.com/',
          oidcClientId: 'ltbase-controlplane-ui',
          redirectUri: 'https://admin.example.com/auth/callback/',
          authProviders: [
       {
          type: 'firebase',
          name: 'primary',
          label: 'Primary Firebase',
          firebaseProjectId: 'ltbase-prod',
          firebaseApiKey: 'firebase-api-key',
        },
        {
          type: 'supabase',
          name: 'backup',
          label: 'Backup Supabase',
          supabaseUrl: 'https://supabase.example.com/',
          supabaseAnonKey: 'supabase-anon-key',
        },
          ],
        },
      ],
    });

    expect(config.stacks[0]?.authBaseUrl).toBe('https://auth.example.com');
    expect(config.stacks[0]?.controlPlaneBaseUrl).toBe('https://control-plane.example.com');
    expect(config.stacks[0]?.projectId).toBe('ltbase-prod');
    expect(config.stacks[0]?.redirectUri).toBe('https://admin.example.com/auth/callback/');
    expect(config.stacks[0]?.oidcClientId).toBe('ltbase-controlplane-ui');
    expect(config.stacks[0]?.authProviders).toEqual([
      {
        type: 'firebase',
        name: 'primary',
        label: 'Primary Firebase',
        firebaseProjectId: 'ltbase-prod',
        firebaseApiKey: 'firebase-api-key',
      },
      {
        type: 'supabase',
        name: 'backup',
        label: 'Backup Supabase',
        supabaseUrl: 'https://supabase.example.com',
        supabaseAnonKey: 'supabase-anon-key',
      },
    ]);
  });

  it('rejects duplicate stack keys', () => {
    expect(() =>
      parseRuntimeConfig({
        stacks: [
          {
            key: 'prod',
            label: 'Production',
            projectId: 'ltbase-prod',
            authBaseUrl: 'https://auth.example.com',
            controlPlaneBaseUrl: 'https://control-plane.example.com',
            apiBaseUrl: 'https://api.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
            authProviders: [
              {
                type: 'firebase',
                name: 'primary',
                label: 'Primary Firebase',
                firebaseProjectId: 'ltbase-prod',
                firebaseApiKey: 'firebase-api-key',
              },
            ],
          },
          {
            key: 'prod',
            label: 'Production duplicate',
            projectId: 'ltbase-prod-2',
            authBaseUrl: 'https://auth2.example.com',
            controlPlaneBaseUrl: 'https://control2.example.com',
            apiBaseUrl: 'https://api2.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
            authProviders: [
              {
                type: 'supabase',
                name: 'backup',
                label: 'Backup Supabase',
                supabaseUrl: 'https://supabase.example.com',
                supabaseAnonKey: 'supabase-anon-key',
              },
            ],
          },
        ],
      }),
    ).toThrow('duplicate stack key: prod');
  });

  it('rejects duplicate provider names within a stack', () => {
    expect(() =>
      parseRuntimeConfig({
        stacks: [
          {
            key: 'prod',
            label: 'Production',
            projectId: 'ltbase-prod',
            authBaseUrl: 'https://auth.example.com',
            controlPlaneBaseUrl: 'https://control-plane.example.com',
            apiBaseUrl: 'https://api.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
            authProviders: [
              {
                type: 'firebase',
                name: 'shared',
                label: 'Shared Firebase',
                firebaseProjectId: 'ltbase-prod',
                firebaseApiKey: 'firebase-api-key',
              },
              {
                type: 'supabase',
                name: 'shared',
                label: 'Shared Supabase',
                supabaseUrl: 'https://supabase.example.com',
                supabaseAnonKey: 'supabase-anon-key',
              },
            ],
          },
        ],
      }),
    ).toThrow('duplicate auth provider name in stack prod: shared');
  });

  it('rejects stacks missing current auth flow fields', () => {
    expect(() =>
      parseRuntimeConfig({
        stacks: [
          {
            key: 'prod',
            label: 'Production',
            projectId: 'ltbase-prod',
            authBaseUrl: 'https://auth.example.com',
            controlPlaneBaseUrl: 'https://control-plane.example.com',
            apiBaseUrl: 'https://api.example.com',
            authProviders: [
              {
                type: 'firebase',
                name: 'primary',
                label: 'Primary Firebase',
                firebaseProjectId: 'ltbase-prod',
                firebaseApiKey: 'firebase-api-key',
              },
            ],
          },
        ],
      }),
    ).toThrow('stack config field oidcClientId is required');
  });

  it('rejects auth providers missing current browser config fields', () => {
    expect(() =>
      parseRuntimeConfig({
        stacks: [
          {
            key: 'prod',
            label: 'Production',
            projectId: 'ltbase-prod',
            authBaseUrl: 'https://auth.example.com',
            controlPlaneBaseUrl: 'https://control-plane.example.com',
            apiBaseUrl: 'https://api.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
            authProviders: [
              {
                type: 'firebase',
                name: 'primary',
                label: 'Primary Firebase',
                firebaseApiKey: 'firebase-api-key',
              },
            ],
          },
        ],
      }),
    ).toThrow('stack config field firebaseProjectId is required');
  });
});
