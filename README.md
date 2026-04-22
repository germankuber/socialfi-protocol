<p align="center">
  <img src="docs/assets/logo.png" alt="Polkadot Stack Template" width="200" />
</p>

# Polkadot Stack Template

A SocialFi reference implementation on Polkadot. Profiles, posts with public/obfuscated/private visibility, follows, a permissionless app registry, delegated managers, sponsored transactions, and real-time notifications via the Substrate Statement Store — all on a single parachain runtime.

## What's Inside

- **Polkadot SDK Blockchain** ([`blockchain/`](blockchain/)) — A Cumulus-based parachain compatible with `polkadot-omni-node`
  - **SocialFi Pallets** ([`blockchain/pallets/`](blockchain/pallets/)) — `social-app-registry`, `social-profiles`, `social-graph`, `social-feeds`, `social-managers`, `sponsorship`
  - **Notifications Primitives** ([`blockchain/primitives/social-notifications/`](blockchain/primitives/social-notifications/)) — Shared helpers to build Statement Store notifications
  - **Parachain Runtime** ([`blockchain/runtime/`](blockchain/runtime/)) — Wires the pallets + `pallet-statement` into a single construct-runtime
- **Frontend** ([`web/`](web/)) — React + TypeScript app using PAPI for pallet interactions and `@polkadot-apps/statement-store` for live notifications
- **Indexer** ([`indexer/`](indexer/)) — Optional TypeScript service that denormalises pallet events for the frontend
- **CLI** ([`cli/`](cli/)) — Rust CLI for chain queries and Statement Store submit/dump via subxt
- **Dev Scripts** ([`scripts/`](scripts/)) — One-command scripts to build, start, and test the stack locally

See [`docs/ARCHITECTURE_OVERVIEW.md`](docs/ARCHITECTURE_OVERVIEW.md) for the full whole-stack walkthrough.

## Quick Start

### Docker (no Rust required)

```bash
docker compose up -d

# Start the frontend on the host
cd web && pnpm install && pnpm dev
```

The Docker build compiles the Rust runtime and generates the chain spec automatically. See [`web/README.md`](web/README.md) for frontend-specific follow-up.

### Native (Rust toolchain)

```bash
# Fetch pinned SDK binaries into ./bin/
./scripts/download-sdk-binaries.sh

# Full local stack: relay chain + collator + frontend
./scripts/start-all.sh
```

Prerequisites:

- **Rust**: stable (pinned via `rust-toolchain.toml`)
- **Node.js**: 22.x LTS (pinned via `.nvmrc`)
- **Polkadot SDK binaries** (stable2512-3): `polkadot`, `polkadot-prepare-worker`, `polkadot-execute-worker` (relay), `polkadot-omni-node`. Fetched into `./bin/` by the script above.
- **Zombienet** (`npm install -g @zombienet/cli`) for local relay-chain testing.

See [`docs/INSTALL.md`](docs/INSTALL.md) for the full setup guide.

## Running

```bash
# Full local stack
./scripts/start-all.sh

# Lightweight solo-node dev loop
./scripts/start-dev.sh

# Zombienet only (no frontend)
./scripts/start-local.sh

# Frontend only (for an already-running chain)
./scripts/start-frontend.sh
```

## Format & Lint

```bash
# Rust (requires nightly for rustfmt config options)
cargo +nightly fmt
cargo clippy --workspace

# Frontend
cd web && pnpm fmt && pnpm lint
```

## Test Commands

```bash
# All Rust tests
cargo test --workspace

# Statement Store smoke test
./scripts/test-statement-store-smoke.sh

# Frontend type-check
cd web && pnpm tsc --noEmit
```

## Documentation

- [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) — Whole-stack walkthrough
- [docs/NOTIFICATIONS_ARCHITECTURE.md](docs/NOTIFICATIONS_ARCHITECTURE.md) — Real-time notifications component map
- [docs/NOTIFICATIONS_FLOW.md](docs/NOTIFICATIONS_FLOW.md) — End-to-end notification sequence
- [docs/NOTIFICATIONS_TOPICS.md](docs/NOTIFICATIONS_TOPICS.md) — Topic + payload contract
- [docs/ENCRYPTED_POSTS.md](docs/ENCRYPTED_POSTS.md) — Crypto design for private posts
- [docs/TOOLS.md](docs/TOOLS.md) — Polkadot stack components used here
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment guide
- [docs/INSTALL.md](docs/INSTALL.md) — Local setup

## Key Versions

| Component | Version |
|---|---|
| polkadot-sdk | stable2512-3 (umbrella crate v2512.3.3) |
| polkadot / polkadot-omni-node | v1.21.3 |
| chain-spec-builder | v17.0.0 |
| zombienet | 1.3.x |
| Rust | stable (pinned via `rust-toolchain.toml`) |
| Node.js | 22.x LTS |

## License

MIT. See [LICENSE](LICENSE).
