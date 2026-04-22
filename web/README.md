# Web

The React frontend for the template.

## Overview

- React + Vite + TypeScript + Tailwind CSS
- [Polkadot API (PAPI)](https://papi.how/) for pallet interaction
- [`@polkadot-apps/statement-store`](https://www.npmjs.com/package/@polkadot-apps/statement-store) for real-time notifications
- Zustand for state management

Key pages:

- Home
- People
- Protocol Stats
- Social: Feed, Graph, Profile, Apps, Accounts, Managers, Sponsorship, Transactions

## Local Development

```bash
cd web
pnpm install
pnpm dev
```

Or, from the repo root, if the chain is already running:

```bash
./scripts/start-frontend.sh
```

## Endpoint Configuration

For hosted builds:

```bash
cp web/.env.example web/.env.local
```

Set:

- `VITE_WS_URL`

For local scripted development, `../scripts/start-all.sh` and `../scripts/start-frontend.sh` export `VITE_LOCAL_WS_URL` so the browser aligns with the active local stack ports.

## PAPI Descriptors

Generated descriptors live in [`.papi/`](.papi/).

```bash
cd web
pnpm update-types   # update descriptor metadata from the running chain
pnpm codegen        # regenerate typed descriptors
pnpm build          # production build
pnpm lint
pnpm fmt
```

## Deployment

See [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for hosted-frontend deployment options.
