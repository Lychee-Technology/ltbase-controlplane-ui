export interface FirebaseAuthProviderConfig {
  type: 'firebase';
  name: string;
  label: string;
  firebaseProjectId: string;
  firebaseApiKey: string;
}

export interface SupabaseAuthProviderConfig {
  type: 'supabase';
  name: string;
  label: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export type AuthProviderConfig = FirebaseAuthProviderConfig | SupabaseAuthProviderConfig;

export interface StackConfig {
  key: string;
  label: string;
  projectId: string;
  authBaseUrl: string;
  controlPlaneBaseUrl: string;
  apiBaseUrl: string;
  authProviders: AuthProviderConfig[];
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
  providerName?: string;
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

export type WorkspaceKey = 'model' | 'workflow' | 'security' | 'health' | 'referrals';
