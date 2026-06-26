# Binding Policies Management Implementation Plan

> **Goal:** Build Binding Policies management workspace with CRUD, list from GET
> `/api/v1/auth/binding-policies` and write through POST/PATCH/DELETE.

**Architecture:** Mirror the PolicyWorkspace pattern with a dedicated
`src/bindingPolicies/` module containing data parsing, form, workspace, and
styles. Extend the `ControlPlaneClient` with binding-policy API methods.

**Tech Stack:** React 19, TypeScript strict, Vitest + @testing-library/react

**Source issue:** https://github.com/Lychee-Technology/ltbase-controlplane-ui/issues/30

---

## Files

- Modify: `src/api/controlPlaneClient.ts`
- Modify: `src/api/controlPlaneClient.test.ts`
- Modify: `src/types.ts`
- Create: `src/bindingPolicies/bindingPolicyData.ts`
- Create: `src/bindingPolicies/bindingPolicyData.test.ts`
- Create: `src/bindingPolicies/BindingPolicyForm.tsx`
- Create: `src/bindingPolicies/BindingPolicyForm.test.tsx`
- Create: `src/bindingPolicies/BindingPolicyWorkspace.tsx`
- Create: `src/bindingPolicies/BindingPolicyWorkspace.test.tsx`
- Create: `src/bindingPolicies/bindingPolicies.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

---

### Task 1: Extend API client

Add `listBindingPolicies`, `createBindingPolicy`, `updateBindingPolicy`,
`deleteBindingPolicy` to `ControlPlaneClient` interface and factory. Paths:
`GET /auth/binding-policies`, `POST /auth/binding-policies`,
`PATCH /auth/binding-policies/{id}`, `DELETE /auth/binding-policies/{id}`.
Tests covering path, method, body, `encodeURIComponent`.

### Task 2: Create binding policy data layer

- `AuthBindingPolicy` interface matching RFC §4.5 shape (policyId, enabled,
  priority, slug, externalKey, rules, createdAt, updatedAt)
- `BindingPolicyFormValue` for form submission
- Parsers: `parseBindingPolicyList` (reads `items`), `parseBindingPolicyDetail`
  (reads `data.binding_policy`), `parseBindingPolicy`
- `validateBindingRulesJSON` — syntactic JSON only
- `formatBindingRules`, `defaultBindingRulesJSON`, `summarizeBindingRules`
- Full test coverage for all parsers and validators

### Task 3: BindingPolicyForm

- Mode: `create` / `edit`
- Fields: `Enabled` checkbox, `Priority` integer input, `Rules` JSON textarea
- Edit mode shows read-only `Policy ID`, `Slug`, `External Key`
- Client-side validation: JSON syntax required, priority must be non-negative
  integer
- Tests: create defaults, submit payload, invalid JSON block, invalid priority
  block, edit initial values

### Task 4: BindingPolicyWorkspace

- Sign-in prompt when no client
- List table: enabled badge, priority, policy ID, slug, rules summary
- Create/edit/delete flows with confirmation
- Detail pane: all fields plus formatted rules block
- Tests: sign-in prompt, list load, empty state, error+retry, create flow,
  detail navigation, delete confirmation, delete error

### Task 5: Wire into App

- `WorkspaceKey` adds `'bindingPolicies'`
- In `App.tsx`: import `BindingPolicyWorkspace`, nav item, render
- In `App.test.tsx`: mock `BindingPolicyWorkspace` module
- Add binding-policy vi.fn() stubs to `makeClient` in
  OverviewDashboard/PolicyWorkspace/ReferralWorkspace/RoleWorkspace/
  UserWorkspace test files

### Task 6: Styles

`bindingPolicies.css` with status-badge variants and rules-preview block.
Reuse `.panel`, `.button`, `.policy-table`, `.kv-list`, `.form-*`,
`.schema-textarea` from styles.css.

### Task 7: Verify

Run: `pnpm test -- --run`, `pnpm run typecheck`, `pnpm run build`
