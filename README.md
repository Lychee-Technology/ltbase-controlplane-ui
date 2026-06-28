# LTBase Control Plane UI

Customer-facing Control Plane Web UI for LTBase private deployments.

This repository owns the React/TypeScript frontend. It is deployed to Cloudflare Pages and calls each stack's Control Plane API with an LTBase admin JWT.

The UI source lives here, but the official customer-consumable release artifact is published through the unified LTBase application release pipeline. A new `release_id` should package both backend artifacts and the Control Plane UI artifact together in `ltbase-releases`.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Useful checks:

```bash
pnpm run typecheck
pnpm test -- --run
pnpm run build
pnpm run build:release-artifact
```

## Release Artifact

Official LTBase product releases consume a versioned static UI artifact from this repository.

`pnpm run build:release-artifact` produces `dist/release/ltbase-controlplane-ui.tar.gz`.
The tarball contains a deployable static site root, including `_redirects`, but it must not contain `ltbase-controlplane.config.json`.
Customer-specific runtime config is injected later by the private deployment workflow for each deployment repository.

## Runtime Configuration

The app loads `/ltbase-controlplane.config.json` at runtime. This file must contain only non-secret values:

- stack key and display label
- `authBaseUrl`
- `controlPlaneBaseUrl`
- `apiBaseUrl`
- public OIDC/authservice client id
- redirect URI

Customer deployment repositories render this file from their own `CONTROLPLANE_UI_STACK_CONFIG` deployment variable during rollout, then the reusable deployment workflows inject it into the official Control Plane UI release artifact before publishing to Cloudflare Pages.
The built site ships `_redirects` so direct OAuth callback hits to `/auth/callback` are rewritten to `index.html` and handled by the SPA.

## Cloudflare Pages Deployment

The UI is deployed to Cloudflare Pages. Runtime configuration is injected at build time via a single environment variable.

### Environment Variable

Set `CONTROLPLANE_UI_STACK_CONFIG` as a plaintext environment variable in Cloudflare Pages (not a secret — it contains only non-secret values).

The value must be a JSON object with a `stacks` array. Example:

```json
{
  "stacks": [
    {
      "key": "prod",
      "label": "Production",
      "projectId": "11111111-1111-4111-8111-111111111111",
      "authBaseUrl": "https://auth.example.com",
      "controlPlaneBaseUrl": "https://control-plane.example.com",
      "apiBaseUrl": "https://api.example.com",
      "oidcClientId": "ltbase-controlplane-ui",
      "redirectUri": "https://admin.example.com/auth/callback",
      "authProviders": [
        {
          "type": "firebase",
          "name": "firebase-google",
          "label": "Firebase Google",
          "firebaseProjectId": "ltbase-prod",
          "firebaseApiKey": "public-firebase-api-key"
        }
      ]
    }
  ]
}
```

Minify before pasting into Cloudflare Pages UI. The build fails fast with a clear error if the variable is missing, malformed, or missing required fields.

### Build Settings

| Setting | Value |
|---------|-------|
| Build command | `pnpm run build:pages` |
| Output directory | `dist` |

The `build:pages` script runs `render-runtime-config` (which writes `public/ltbase-controlplane.config.json` from the env var) then `vite build`. The built site includes this file at `/ltbase-controlplane.config.json`.

### Local Verification

```bash
CONTROLPLANE_UI_STACK_CONFIG='{"stacks":[...]}' pnpm run build:pages
```

## Schema Editor Boundary

The local JSON Schema editor is intentionally output-only:

- administrators can copy the edited JSON
- administrators can download a `.json` file
- the editor must not call schema apply APIs
- the editor must not update Control Plane schema registry records

Schema files still move through the private deployment repository under `customer-owned/schemas/`.

## Workflow Summaries

The Workflows page is a read-only diagnostic view of workflow definitions:

- it lists each workflow's name, active version, and referenced tools
- it only fetches from the Control Plane `GET /api/v1/workflows` endpoint
- definitions are populated only in local testing, when `LTBASE_LOCAL_TESTING_WORKFLOW_DEFINITION_PATHS` is set or standard paths exist
- it must not author, edit, or apply workflow definitions
