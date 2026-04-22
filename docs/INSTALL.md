<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img src="./assets/logo-light.png" alt="Polkadot Stack Template" width="220" />
  </picture>
</p>

# Installation Guide

Setup steps to build and run the Polkadot Stack Template locally.

## Docker Quick Start (no Rust required)

Only Node.js is needed on the host. Docker builds the Rust runtime and the collator image.

```bash
docker compose up -d

# Then start the frontend on the host:
cd web && pnpm install && pnpm dev
```

The collator exposes the Substrate RPC on `ws://127.0.0.1:9944`.

Tear down:

```bash
docker compose down -v
```

## Native setup (full Rust toolchain)

### Prerequisites

- **Rust**: stable (pinned via `rust-toolchain.toml`). Install via `rustup`.
- **Node.js**: 22.x LTS (pinned via `.nvmrc`). `nvm use` picks it up automatically.
- **pnpm**: `npm install -g pnpm`.
- **Zombienet**: `npm install -g @zombienet/cli`.
- **Polkadot SDK binaries** (stable2512-3): `polkadot`, `polkadot-prepare-worker`, `polkadot-execute-worker`, `polkadot-omni-node`, `chain-spec-builder`.

### Fetch SDK binaries

The helper script downloads every pinned version into `./bin/` (gitignored) and prepends that directory on `PATH` during script runs:

```bash
./scripts/download-sdk-binaries.sh
```

### Build

```bash
# Rust (runtime + pallets + CLI)
cargo build --release

# Frontend
cd web && pnpm install && pnpm build
```

### Run

```bash
# Full local stack: relay chain + collator + frontend
./scripts/start-all.sh

# Lightweight solo-node dev loop (no relay chain)
./scripts/start-dev.sh

# Zombienet only (no frontend)
./scripts/start-local.sh

# Frontend only (for an already-running chain)
./scripts/start-frontend.sh

# Indexer only (optional)
./scripts/start-indexer.sh
```

### Test

```bash
# All Rust tests (workspace)
cargo test --workspace

# Statement Store smoke test
./scripts/test-statement-store-smoke.sh

# Frontend type-check
cd web && pnpm tsc --noEmit
```

## Troubleshooting

### `polkadot-omni-node` version mismatch

The scripts pin expected versions in `scripts/common.sh`. If a global install overrides the `./bin/` version, delete `./bin/` and rerun `./scripts/download-sdk-binaries.sh`.

### `zombienet` not found

```bash
npm install -g @zombienet/cli
```

### PAPI descriptors out of date

After modifying pallet storage or extrinsics:

```bash
cd web
pnpm exec papi update
pnpm exec papi
```

### Chain spec mismatch

Delete `blockchain/chain_spec.json` — the start scripts regenerate it.

## Port reference

| Port | Service |
|---|---|
| 9944 | Substrate RPC (WS + HTTP) |
| 5173 | Frontend (Vite dev server) |
| 30333 | Collator libp2p |
| 9615 | Collator Prometheus |
| 9949/9951 | Relay Alice/Bob RPC |
| 30335/30336 | Relay Alice/Bob libp2p |

Override any port with `STACK_PORT_OFFSET=<n>` or individual `STACK_*_PORT` env vars.
