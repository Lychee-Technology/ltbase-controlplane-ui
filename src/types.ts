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

export type ControlPlaneErrorKind = 'api' | 'network' | 'auth';

export interface ControlPlaneError {
  code: string;
  message: string;
  status?: number;
  requestId?: string;
  details?: unknown;
  kind?: ControlPlaneErrorKind;
}

export interface DraftRecord<T> {
  userKey: string;
  stackKey: string;
  resourceType: string;
  value: T;
  updatedAt: string;
}

export type WorkspaceKey = 'overview' | 'users' | 'roles' | 'policies' | 'organization' | 'model' | 'workflow' | 'security' | 'health' | 'referrals' | 'bindingPolicies';

export function formatControlPlaneError(error: unknown): string {
  if (isControlPlaneErrorShape(error)) {
    const parts: string[] = [];
    if (error.code) parts.push(error.code);
    parts.push(error.message);
    if (error.requestId) parts.push(`[${error.requestId}]`);
    return parts.join(': ');
  }
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

function isControlPlaneErrorShape(value: unknown): value is ControlPlaneError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}

// Shortens a durable UUID for compact display in table cells, keeping the first
// `max` characters and appending an ellipsis. Purely cosmetic — the full id is
// still used for API calls. Callers pass the truncation length their layout needs.
export function truncateUUID(id: string, max = 12): string {
  if (id.length <= max) {
    return id;
  }
  return id.slice(0, max) + '…';
}
