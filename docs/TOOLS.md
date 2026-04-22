<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/logo-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/logo-light.png" />
    <img src="./assets/logo-light.png" alt="Polkadot Stack Template" width="220" />
  </picture>
</p>

# Tools & Components

Reference of the Polkadot SDK components and external tools this template uses.

## Polkadot SDK (`polkadot-sdk` umbrella crate, v2512.3.3)

### FRAME pallets composed into the runtime

| Pallet | Role |
|---|---|
| `frame_system` | Core system primitives: events, block number, nonce |
| `pallet-balances` | Native token accounting |
| `pallet-transaction-payment` | Fee charging (wrapped by `ChargeSponsored`) |
| `pallet-sudo` | Dev-time superuser |
| `pallet-aura` / `pallet-collator-selection` / `pallet-session` | Parachain consensus |
| `pallet-authorship` / `pallet-timestamp` | Block metadata |
| `pallet-statement` (idx 40) | Substrate Statement Store pallet — gossips off-chain signed statements |
| `cumulus_pallet_*` | Parachain system, XCMP, weight reclaim |
| `pallet-xcm` + `staging-xcm-*` | XCM cross-chain messaging |
| `pallet-message-queue` | XCMP message queue |

### SocialFi pallets (project-specific)

| Pallet | Idx | Role |
|---|---|---|
| `social-app-registry` | 51 | Permissionless app registry with bond + custom `AppModerator` origin |
| `social-profiles` | 52 | 1-per-account profile registry with follow fee |
| `social-graph` | 53 | Follow/unfollow edges with per-target fee |
| `social-feeds` | 54 | Posts, replies, encrypted-post delivery, moderation |
| `social-managers` | 55 | Scoped delegation (Lens-style) with synthetic origin + anti-escalation filter |
| `sponsorship` | 56 | Sponsor pots + `ChargeSponsored` TransactionExtension |

## Runtime API & RPC

- **Substrate RPC** — WebSocket on `9944`, HTTP on same port. Used by PAPI, subxt, and the Statement Store subscription.
- **Statement Store RPC** — `statement_submit`, `statement_dump`, `statement_subscribeStatement`. Exposed by the collator; used by `@polkadot-apps/statement-store` in the browser and by `cli/src/commands/chain.rs` from the terminal.

## External binaries

| Binary | Version | Source | Purpose |
|---|---|---|---|
| `polkadot` | v1.21.3 | polkadot-sdk stable2512-3 | Relay chain node |
| `polkadot-prepare-worker` | v1.21.3 | polkadot-sdk stable2512-3 | Required sidecar to `polkadot` |
| `polkadot-execute-worker` | v1.21.3 | polkadot-sdk stable2512-3 | Required sidecar to `polkadot` |
| `polkadot-omni-node` | v1.21.3 | polkadot-sdk stable2512-3 | Collator binary driven by the Cumulus runtime |
| `chain-spec-builder` | v17.0.0 | polkadot-sdk | Generates `chain_spec.json` from the compiled runtime WASM |
| `zombienet` | 1.3.x | npm `@zombienet/cli` | Orchestrates the local relay + parachain topology |

Fetch these into `./bin/` with `./scripts/download-sdk-binaries.sh`.

## Frontend libraries (`web/`)

| Library | Purpose |
|---|---|
| `polkadot-api` (PAPI) | Typed Substrate client. Descriptors checked in under `web/.papi/`. |
| `@polkadot-apps/statement-store` | Statement Store pub/sub client (Parity). Powers live notifications. |
| `@polkadot-labs/hdkd` + `hdkd-helpers` | Sr25519 key derivation for dev accounts |
| `@novasamatech/product-sdk` | Polkadot Host wallet adapter |
| `react-router-dom` | Routing |
| `zustand` | State store |
| `tailwindcss` | Styling |
| `libsodium-wrappers` | Client-side X25519 for encrypted posts |

## Indexer libraries (`indexer/`)

| Library | Purpose |
|---|---|
| `polkadot-api` + `@polkadot-api/ws-provider` | Subscribe to chain events |
| `express` | Local API server |
| `lowdb` | File-backed JSON store (dev only; swap for Postgres in prod) |
| `cors` | Cross-origin requests from the frontend |

## CLI libraries (`cli/`)

| Library | Purpose |
|---|---|
| `subxt` + `subxt-signer` | Substrate extrinsic submission and event subscription |
| `sp-statement-store` + `sp-core` | Build and sign statements for the Statement Store RPC |
| `clap` | Argument parsing |
| `reqwest` | JSON-RPC helper for Statement Store calls |
| `blake2`, `hex`, `bip39` | Hashing and key derivation |

## IPFS

Post bodies and profile metadata are stored off-chain via IPFS. The chain keeps only the CID. No code in this repo runs an IPFS node — the frontend reads from a public gateway (configurable).
