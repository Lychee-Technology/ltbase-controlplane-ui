import type { AuthOrgUnit, AuthOrgUser, OrgUnitPolicyAttachment } from './organizationData';

export type OrgPage =
  | { kind: 'tree' }
  | { kind: 'create' }
  | { kind: 'edit'; ouId: string };

export type OrgListLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; units: AuthOrgUnit[]; tree: import('./organizationData').OrgTree[] };

export type DetailLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; unit: AuthOrgUnit };

export type UsersLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; users: AuthOrgUser[] };

export type PoliciesLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; attachments: OrgUnitPolicyAttachment[] };
