import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from './config';

describe('parseRuntimeConfig', () => {
  it('accepts valid stack config and normalizes URL slashes', () => {
    const config = parseRuntimeConfig({
      stacks: [
        {
          key: 'prod',
          label: 'Production',
          authBaseUrl: 'https://auth.example.com/',
          controlPlaneBaseUrl: 'https://control-plane.example.com/',
          apiBaseUrl: 'https://api.example.com/',
          oidcClientId: 'ltbase-controlplane-ui',
          redirectUri: 'https://admin.example.com/auth/callback',
        },
      ],
    });

    expect(config.stacks[0]?.authBaseUrl).toBe('https://auth.example.com');
    expect(config.stacks[0]?.controlPlaneBaseUrl).toBe('https://control-plane.example.com');
  });

  it('rejects duplicate stack keys', () => {
    expect(() =>
      parseRuntimeConfig({
        stacks: [
          {
            key: 'prod',
            label: 'Production',
            authBaseUrl: 'https://auth.example.com',
            controlPlaneBaseUrl: 'https://control-plane.example.com',
            apiBaseUrl: 'https://api.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
          },
          {
            key: 'prod',
            label: 'Production duplicate',
            authBaseUrl: 'https://auth2.example.com',
            controlPlaneBaseUrl: 'https://control2.example.com',
            apiBaseUrl: 'https://api2.example.com',
            oidcClientId: 'ltbase-controlplane-ui',
            redirectUri: 'https://admin.example.com/auth/callback',
          },
        ],
      }),
    ).toThrow('duplicate stack key: prod');
  });
});
