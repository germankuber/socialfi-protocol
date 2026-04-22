<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.png" />
    <img src="docs/assets/logo-light.png" alt="Polkadot Stack Template" width="320" />
  </picture>
</p>

# Polkadot Stack Template

A SocialFi reference implementation on Polkadot. Profiles, posts with public/obfuscated/private visibility, follows, a permissionless app registry, delegated managers, sponsored transactions, and real-time notifications via the Substrate Statement Store — all on a single parachain runtime.

## Architecture at a Glance

```
                                                  ┌──────────────────┐
                                   ┌─────────────►│     Wallets      │
                                   │  sign req    │  PJS / Talisman  │
                                   │◄─────────────│    / SubWallet   │
                                   │  signed tx   └──────────────────┘
                                   │
 ┌──────────────────┐   CIDs  ┌────┴─────────────┐        HTTP :3001
 │  IPFS Gateway    │◄───────►│   Web Frontend   │◄──────────────────────────┐
 │  post / profile  │         │  React + Vite    │  /api/tx, /api/events     │
 │  media & meta    │  upload │  PAPI + Tailwind │                           │
 └──────────────────┘  fetch  └────┬─────────────┘                           │
                                   │                                         │
                    ┌──────────────┼──────────────┐                          │
                    │              │              │                          │
               read │         write│              │ subscribe                │
               PAPI │         PAPI │              │ PAPI / statement-store   │
                    │              │              │                          │
    storage queries │  submit      │              │  events + statements     │
    view functions  │  signed tx   │              │  streaming               │
                    ▼              ▼              ▼                          │
 ┌───────────────────────────────────────────────────────────────────────────┼──┐
 │                      NODE LAYER  (ws://…:9944)                            │  │
 │                                                                           │  │
 │     polkadot-omni-node   —   RPC   ·   TxPool   ·   P2P gossip            │  │
 │                                                                           │  │
 │   ┌─────────────────────────────────────────────────────────────────┐     │  │
 │   │                        RUNTIME                                  │     │  │
 │   │                                                                 │     │  │
 │   │   TxExtension pipeline (per extrinsic):                         │     │  │
 │   │   CheckNonZeroSender → CheckSpec/Tx/Genesis/Era/Nonce/Weight    │     │  │
 │   │       → ChargeSponsored<ChargeTransactionPayment>               │     │  │
 │   │         (wrapper redirects fees to sponsor pot)                 │     │  │
 │   │       → CheckMetadataHash                                       │     │  │
 │   │                                                                 │     │  │
 │   │   SocialFi Pallets                                              │     │  │
 │   │   ─────────────────────────────────────────────────────────     │     │  │
 │   │   [51] social-app-registry   [52] social-profiles               │     │  │
 │   │        per-app bond + app          one profile / AccountId,     │     │  │
 │   │        moderator origin            metadata CID + follow fee    │     │  │
 │   │                                                                 │     │  │
 │   │   [53] social-graph          [54] social-feeds                  │     │  │
 │   │        follows, follower          posts / replies / timeline,   │     │  │
 │   │        counts, per-target fee     obfuscated + encrypted posts  │     │  │
 │   │                                   (capsule + OCW unseal)        │     │  │
 │   │                                                                 │     │  │
 │   │   [55] social-managers       [56] sponsorship                   │     │  │
 │   │        scoped delegation,         SponsorPots, ChargeSponsored  │     │  │
 │   │        expiry purge, anti-        wrapper, balance-zero         │     │  │
 │   │        escalation filter          onboarding                    │     │  │
 │   │                                                                 │     │  │
 │   │   [40] pallet-statement  —  real-time notification gossip       │     │  │
 │   └─────────────────────────────────────────────────────────────────┘     │  │
 │                                                                           │  │
 │   ┌─────────────────────────────────────────────────────────────────┐     │  │
 │   │                     OCW (Offchain Worker)                       │     │  │
 │   │                                                                 │     │  │
 │   │   • social-feeds OCW — drains `PendingUnlocks`                  │     │  │
 │   │   • statement-store OCW — attaches `Proof::OnChain`             │     │  │
 │   └──────────────────────────────────┬──────────────────────────────┘     │  │
 │                                      │                                    │  │
 └─────┬────────────────────────────────┼────────────────────────────────────┘  │
       │                                │                                       │
       │ PAPI WS: events subscribe      │  unseal(capsule) + sign               │
       ▼                                │  (HTTP to external service)           │
 ┌──────────────────┐                   ▼                                       │
 │     Indexer      │         ┌──────────────────────┐                          │
 │  PAPI subscribe  │         │    Key Service       │                          │
 │  events → lowdb  │         │  (external — WIP)    │                          │
 │  HTTP API :3001  │         │  custodies X25519    │                          │
 └──────┬───────────┘         │  + sr25519; signs    │                          │
        │                     │  on request          │                          │
        └─────────────────────┴──────────────────────┘ ──────────────────────── │
         serves denormalised tx / event history to the frontend (top-right) ───┘
```

**Key dataflows**

- **Read path**: The frontend pulls live state **straight from the node** over PAPI WS (storage + view functions + statement-store subscriptions) and denormalised tx/event history **from the indexer HTTP API** (`:3001`). IPFS is hit directly from the browser to materialise post/profile media referenced by on-chain CIDs.
- **Write path**: The frontend asks the **wallet** (PJS / Talisman / SubWallet) to sign the extrinsic; the wallet returns the signed bytes and the **frontend submits them to the node** via PAPI. The node propagates the tx, the runtime dispatches it, and both the frontend (via its own PAPI subscription) and the indexer (via its event watcher) observe the resulting events.
- **Encrypted read path**: Viewer pays `unlock_post` → OCW reads `PendingUnlocks` and **calls the external Key Service** over HTTP. The service custodies the X25519 keypair, opens the capsule, re-seals the content key for the viewer, and signs the delivery payload. OCW submits `deliver_unlock_unsigned` → viewer polls `Unlocks` and decrypts locally. The in-repo `dev_key.rs` is a dev-only stub that inlines the key inside the collator; production moves it behind the Key Service.
- **Sponsored transaction**: `ChargeSponsored.validate` detects a funded sponsor for the signer → `prepare` debits the pot and tops up the beneficiary → native `ChargeTransactionPayment` withdraws the fee (net zero on the beneficiary).
- **Real-time notification**: Pallet emits a statement → `NotificationStatementSubmitter` forwards to `pallet-statement` → OCW attaches `Proof::OnChain` → gossip → frontend `@polkadot-apps/statement-store` subscription updates the bell.

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
