# LTBase Control Plane UI

Customer-facing Control Plane Web UI for LTBase private deployments.

This repository owns the React/TypeScript frontend. It is deployed to Cloudflare Pages and calls each stack's Control Plane API with an LTBase admin JWT.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test -- --run
npm run build
npm run build:release-artifact
```

## Release Artifact

Official LTBase product releases consume a versioned static UI artifact from this repository.

`npm run build:release-artifact` produces `dist/release/ltbase-controlplane-ui.tar.gz`.
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

The built site ships `_redirects` so direct OAuth callback hits to `/auth/callback` are rewritten to `index.html` and handled by the SPA.

## Schema Editor Boundary

The local JSON Schema editor is intentionally output-only:

- administrators can copy the edited JSON
- administrators can download a `.json` file
- the editor must not call schema apply APIs
- the editor must not update Control Plane schema registry records

Schema files still move through the private deployment repository under `customer-owned/schemas/`.
