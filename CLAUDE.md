# CLAUDE.md

Context for AI agents working with this repo. Keep this file short:
it's a set of **pointers**, not content. The content lives in the
files pointed at.

## Where things live

| What | Where |
| --- | --- |
| Architecture (diagram + walkthrough) | `README.md` + [`docs/ARCHITECTURE_OVERVIEW.md`](docs/ARCHITECTURE_OVERVIEW.md) |
| Pallets | `blockchain/pallets/` |
| Notification primitives | `blockchain/primitives/social-notifications/` |
| Runtime (construct_runtime + pallet configs) | `blockchain/runtime/src/{lib.rs,configs/mod.rs}` |
| Frontend | `web/` |
| Indexer | `indexer/` |
| CLI | `cli/` |
| Scripts | `scripts/` — **invoke them via `make`** (`make help`) |
| Encrypted-posts flow | [`docs/ENCRYPTED_POSTS_WORKFLOW.md`](docs/ENCRYPTED_POSTS_WORKFLOW.md) |
| Notifications flow + topics | [`docs/NOTIFICATIONS_FLOW.md`](docs/NOTIFICATIONS_FLOW.md), [`docs/NOTIFICATIONS_TOPICS.md`](docs/NOTIFICATIONS_TOPICS.md) |
| Install / run | [`docs/INSTALL.md`](docs/INSTALL.md) |
| Deploy | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |

## Pallet indices

`social-app-registry 51`, `social-profiles 52`, `social-graph 53`,
`social-feeds 54`, `social-managers 55`, `sponsorship 56`,
`pallet-statement 40`.

## Build / test / run

Everything is exposed via `make`. Use `make help`.

PAPI descriptors are checked in under `web/.papi/`. After modifying
pallet storage or calls regenerate with:

```bash
cd web && pnpm exec papi update && pnpm exec papi
```

## Non-obvious facts

- Dev chain ID `420420421`; Polkadot Hub TestNet `420420417`.
- Dev accounts (Alice / Bob / Charlie) are **public** well-known
  Substrate keys — never treat them as secrets.
- `blockchain/chain_spec.json` is generated — it is gitignored.
- The X25519 secret in `social-feeds/src/dev_key.rs` is a dev-only
  stub. Production moves it behind an external **Key Service**
  (`README.md` diagram + `ARCHITECTURE_OVERVIEW.md`).
- `CLI` uses `subxt`; the frontend uses **PAPI**. Don't mix them.

## Known rough edges

- Key custody is a compile-time constant (see above).
- Runtime integration tests are thin (`blockchain/runtime/src/tests.rs`).
- Indexer is single-node lowdb — fine for local dev, not for prod.
