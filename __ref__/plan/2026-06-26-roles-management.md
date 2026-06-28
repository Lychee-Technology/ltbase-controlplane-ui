# Roles Management Implementation Plan

> **Goal:** Build Roles Management workspace with CRUD, parent-role hierarchy, policy
> attachments, and jump-to-role search (by durable ID or slug).

**Architecture:** Mirror the PolicyWorkspace pattern with a dedicated `src/roles/`
module containing data parsing, form, workspace, and styles. Extend the
ControlPlaneClient with role and principal-policy API methods.

**Tech Stack:** React 19, TypeScript strict, Vitest + @testing-library/react

**Source issue:** https://github.com/Lychee-Technology/ltbase-controlplane-ui/issues/28

---

## Files

- Modify: `src/api/controlPlaneClient.ts`
- Modify: `src/api/controlPlaneClient.test.ts`
- Create: `src/roles/roleData.ts`
- Create: `src/roles/roleData.test.ts`
- Create: `src/roles/RoleForm.tsx`
- Create: `src/roles/RoleForm.test.tsx`
- Create: `src/roles/RoleWorkspace.tsx`
- Create: `src/roles/RoleWorkspace.test.tsx`
- Create: `src/roles/roles.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

---

### Task 1: Extend API client

Add `listRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole`,
`listRolePolicies`, `attachRolePolicy`, `detachRolePolicy` to `ControlPlaneClient`
interface and factory. Add tests covering path, method, body, and
`encodeURIComponent`.

### Task 2: Create role data layer

- `AuthRole` interface: `roleId`, `name`, `description`, `slug`, `externalKey`,
  `parentRoleIds`, `createdAt`, `updatedAt`
- `RoleFormValue` interface: `name`, `description`, `parentRoleIds`
- `RolePolicyAttachment` interface
- Parser functions: `parseRoleList`, `parseRoleDetail`, `parseRolePolicyAttachments`
- Tests for all parsers

### Task 3: RoleForm component

- Fields: `name`, `description`
- Read-only fields: `slug`, `external_key`, `role_id`
- Parent role picker with search/filter matching `name`, `slug`, `role_id`
- Edit mode excludes current role from parent candidates
- Submit: `name`, `description`, `parent_role_ids`
- Tests: create mode, edit mode, parent picker filtering, submit

### Task 4: RoleWorkspace component

- Sign-in prompt when no client
- Role list table: name, slug, description preview
- Jump-to-role input: enter `role_id` or `slug`, fetches role detail
- Create/edit/delete role with confirmation
- Detail pane with role fields and policy tab
- Policy tab: list, attach, detach direct policies on the role
- `role_in_use` error explanation on delete
- Tests: list load, jump-to-role (by ID, by slug, not-found), CRUD flow,
  policy attach/detach, delete blocked

### Task 5: Styles

`roles.css` with role-specific styles (parent picker, policy tab, description
preview). Reuse existing `.panel`, `.button`, `.form-*`, `.kv-list` classes.

### Task 6: Wire into App

Replace `Roles` placeholder in `App.tsx` with `<RoleWorkspace client={client} />`.
Update `App.test.tsx` mock.

### Task 7: Verify

Run: `pnpm test -- --run`, `pnpm run typecheck`, `pnpm run build`
