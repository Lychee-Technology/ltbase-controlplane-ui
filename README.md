# LTBase Control Plane UI

Customer-facing Control Plane Web UI for LTBase private deployments.

This repository owns the React/TypeScript frontend. It is deployed to Cloudflare Pages and calls each stack's Control Plane API with an LTBase admin JWT.

The UI source lives here, but the official customer-consumable release artifact is published through the unified LTBase application release pipeline. A new `release_id` should package both backend artifacts and the Control Plane UI artifact together in `ltbase-releases`.

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
```

## Runtime Configuration

The app loads `/ltbase-controlplane.config.json` at runtime. This file must contain only non-secret values:

- stack key and display label
- `authBaseUrl`
- `controlPlaneBaseUrl`
- `apiBaseUrl`
- public OIDC/authservice client id
- redirect URI

Customer deployment repositories render this file from their own `CONTROLPLANE_UI_STACK_CONFIG` deployment variable during rollout, then the reusable deployment workflows inject it into the official Control Plane UI release artifact before publishing to Cloudflare Pages.
The Pages artifact also ships `public/_redirects` so direct OAuth callback hits to `/auth/callback` are rewritten to `index.html` and handled by the SPA.

## Schema Editor Boundary

The local JSON Schema editor is intentionally output-only:

- administrators can copy the edited JSON
- administrators can download a `.json` file
- the editor must not call schema apply APIs
- the editor must not update Control Plane schema registry records

Schema files still move through the private deployment repository under `customer-owned/schemas/`.
