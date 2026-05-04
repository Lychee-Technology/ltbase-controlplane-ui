export interface StackConfig {
  key: string;
  label: string;
  authBaseUrl: string;
  controlPlaneBaseUrl: string;
  apiBaseUrl: string;
  oidcClientId: string;
  redirectUri: string;
}

export interface RuntimeConfig {
  stacks: StackConfig[];
}

export interface SessionState {
  accessToken: string;
  refreshToken?: string;
  subject?: string;
  email?: string;
}

export interface ControlPlaneError {
  code: string;
  message: string;
  details?: unknown;
}

export interface DraftRecord<T> {
  userKey: string;
  stackKey: string;
  resourceType: string;
  value: T;
  updatedAt: string;
}

export type WorkspaceKey = 'model' | 'security' | 'health' | 'referrals';
