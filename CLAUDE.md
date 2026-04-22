# CLAUDE.md

This file provides context for AI agents working with this repository.

## Project Purpose

A SocialFi reference stack on Polkadot: profiles, posts with public/obfuscated/private visibility, follows, app registry, delegated managers, sponsored fees, and real-time notifications via the Substrate Statement Store.

## Component Map

| Component | Path | Tech |
|---|---|---|
| FRAME Pallets | `blockchain/pallets/` | Rust, FRAME, polkadot-sdk |
| Notifications primitives | `blockchain/primitives/social-notifications/` | Rust, sp-statement-store |
| Parachain Runtime | `blockchain/runtime/` | Rust, Cumulus |
| Frontend | `web/` | React 18, Vite, TypeScript, Tailwind, PAPI, @polkadot-apps/statement-store |
| Indexer | `indexer/` | TypeScript, Express, lowdb, PAPI |
| CLI | `cli/` | Rust, subxt, clap |
| Scripts | `scripts/` | Bash (start, test helpers) |

## SocialFi pallets (`blockchain/pallets/`)

- `social-app-registry` (idx 51) — registry of "apps" with per-app bond + custom `AppModerator` origin.
- `social-profiles` (idx 52) — one profile per account, holds metadata CID + follow fee.
- `social-graph` (idx 53) — follow / unfollow edges, per-target fee.
- `social-feeds` (idx 54) — posts, replies, encrypted posts (capsules), moderation via `EnsureAppModerator`.
- `social-managers` (idx 55) — scoped delegation, synthetic origin + anti-escalation filter.
- `sponsorship` (idx 56) + `ChargeSponsored` TransactionExtension — pay fees from a sponsor pot.
- `pallet-statement` (idx 40) — Parity's Statement Store, drives real-time notification gossip.

## How the Layers Connect

- The **frontend** talks to the chain via **PAPI** over WebSocket (`ws://127.0.0.1:9944` in dev). Notifications use the **`@polkadot-apps/statement-store`** NPM client against the same endpoint.
- The **CLI** uses **subxt** for chain info and the Statement Store JSON-RPC for statement submit/dump.
- The **indexer** (optional, localhost-only) subscribes via PAPI and denormalises events into a JSON file for the frontend to query.
- The local dev chain ID is `420420421`. The Polkadot Hub TestNet chain ID is `420420417`.
- Notifications flow: pallets emit via `social-notifications-primitives::build_statement` → `NotificationStatementSubmitter` adapter in the runtime → `pallet-statement::submit_statement` → `pallet-statement::offchain_worker` attaches `Proof::OnChain` → statement gossip → frontend subscription.

## Key Files

- `blockchain/runtime/src/lib.rs` — Runtime definition, `construct_runtime!`, runtime APIs (incl. `ValidateStatement`).
- `blockchain/runtime/src/configs/mod.rs` — All pallet configuration + `NotificationStatementSubmitter` adapter.
- `blockchain/runtime/src/configs/xcm_config.rs` — XCM cross-chain messaging config.
- `blockchain/primitives/social-notifications/src/lib.rs` — Shared notification helpers (topics, payload).
- `blockchain/pallets/social-feeds/src/lib.rs` — Posts + encrypted-post delivery + moderation.
- `blockchain/pallets/social-feeds/src/offchain.rs` — OCW that opens encrypted capsules.
- `cli/src/commands/chain.rs` — CLI chain info + Statement Store RPC.
- `web/src/hooks/social/useNotifications.ts` — Real-time notifications hook.
- `web/src/components/social/NotificationsBell.tsx` — Header bell with unread badge.
- `scripts/common.sh` — Shared script utilities.
- `docs/ARCHITECTURE_OVERVIEW.md` — Whole-stack diagram + walkthrough.
- `docs/NOTIFICATIONS_{ARCHITECTURE,FLOW,TOPICS}.md` — Notifications docs.

## Build Commands

```bash
# Rust (runtime + pallets + CLI)
cargo build --release

# Frontend
cd web && pnpm install && pnpm build
```

## Test Commands

```bash
# All Rust tests
cargo test --workspace

# Frontend type-check
cd web && pnpm tsc --noEmit
```

## Format & Lint

```bash
# Rust (requires nightly for rustfmt config options)
cargo +nightly fmt              # format
cargo +nightly fmt --check      # check only
cargo clippy --workspace        # lint

# Frontend
cd web && pnpm fmt              # format
cd web && pnpm fmt:check        # check only
cd web && pnpm lint             # eslint
```

## Docker

```bash
docker compose up -d    # builds runtime in Docker, starts node
docker compose down -v  # tear down
```

- `docker/Dockerfile.node` — multi-stage: compiles runtime WASM, generates chain spec, packages into polkadot-omni-node image.
- `docker-compose.yml` (root) — single-service stack: node on port 9944.
- `blockchain/Dockerfile` — lightweight deployment image (requires pre-generated chain_spec.json).

## Running Locally

```bash
# Full stack: relay chain + collator + frontend
./scripts/start-all.sh

# Lightweight solo-node dev loop
./scripts/start-dev.sh

# Local zombienet only (no frontend)
./scripts/start-local.sh

# Frontend only (for an already-running chain)
./scripts/start-frontend.sh

# Indexer only
./scripts/start-indexer.sh

# Deploy frontend
./scripts/deploy-frontend.sh

# Statement Store smoke test
./scripts/test-statement-store-smoke.sh
```

## Version Pinning

- **polkadot-sdk**: stable2512-3 (umbrella crate v2512.3.3)
- **Rust**: stable (pinned via `rust-toolchain.toml`)
- **Node.js**: 22.x LTS (pinned via `.nvmrc`)

## Notes for AI Agents

- Dev private keys are **well-known Substrate dev account keys** (Alice, Bob, Charlie). Public test keys, not secrets.
- `web/.papi/` contains checked-in PAPI descriptors so the frontend works out of the box. After modifying pallet storage or calls, regenerate with: `cd web && pnpm exec papi update && pnpm exec papi`.
- `blockchain/chain_spec.json` is in `.gitignore` — generated at build/start time by scripts.
- The X25519 secret used by `social-feeds`'s OCW to decrypt capsules is currently a compile-time constant in `blockchain/pallets/social-feeds/src/dev_key.rs`. See `docs/ARCHITECTURE_OVERVIEW.md` "Known rough edges" for the migration plan.

## Known Gaps / Future Work

- **Encryption key management** — X25519 secret is hardcoded; plan is keystore-backed loading (see architecture doc).
- **Runtime integration tests**: `blockchain/runtime/src/tests.rs` has only one compile-time API assertion test.
- **Shell script linting**: `scripts/` has no linting in CI; a workflow running `shellcheck scripts/*.sh` would catch issues.
- **Indexer is single-node** — fine for dev, needs Postgres for production.
- **Commit message conventions**: Consider adopting Conventional Commits for clearer changelog generation.
