# Deployment Guide

This guide covers deploying the frontend and the parachain runtime.

## Frontend Deployment

The frontend is a static Vite build that talks to a Substrate WebSocket endpoint. Any static host works.

### Production build

```bash
cd web
pnpm install
pnpm build
```

Output lands in `web/dist/`. Upload it to your target.

### Environment variables

The frontend picks up these at build time:

| Var | Purpose | Default |
|---|---|---|
| `VITE_LOCAL_WS_URL` | Substrate RPC endpoint | `ws://127.0.0.1:9944` |

For Cloudflare Pages / Vercel / GitHub Pages, set `VITE_LOCAL_WS_URL` in the host dashboard.

### GitHub Actions deploy

`./scripts/deploy-frontend.sh` dispatches a GitHub Actions workflow that builds the frontend and publishes it. `./scripts/deploy-with-tunnel.sh` does the same but bakes in a local `ngrok` URL so reviewers can hit a running dev collator through the tunnel.

## Parachain Runtime Deployment

### Build the runtime WASM

```bash
cargo build --release
```

Output: `target/release/wbuild/stack-template-runtime/stack_template_runtime.compact.compressed.wasm`.

### Generate the chain spec

```bash
chain-spec-builder create \
  --runtime target/release/wbuild/stack-template-runtime/stack_template_runtime.compact.compressed.wasm \
  --relay-chain paseo \
  --para-id 4000
```

Adjust `--relay-chain` and `--para-id` for your target relay.

### Register on Paseo TestNet

1. Reserve a ParaId via the Paseo slot-auction or the dev faucet.
2. Upload your genesis wasm + chain spec through the Paseo dashboard or via `polkadot-omni-node register`.
3. Start the collator binary pointing at your chain spec:

```bash
polkadot-omni-node \
  --chain path/to/chain_spec.json \
  --collator \
  --rpc-external --rpc-cors all
```

### Docker image

`blockchain/Dockerfile` produces a lightweight deployment image. It expects a pre-generated `chain_spec.json` at build time.

```bash
cargo build --release
chain-spec-builder create ... > blockchain/chain_spec.json
docker build -f blockchain/Dockerfile -t stack-template-node .
```

## Indexer Deployment

For production, swap `lowdb` for Postgres. The indexer code is small (~400 lines) and intentionally non-authoritative — the chain is always the source of truth.

## Production checklist

- [ ] Rotate any `//Alice` / `//Bob` dev accounts out of the chain spec.
- [ ] Replace the hardcoded X25519 key in `blockchain/pallets/social-feeds/src/dev_key.rs` with a keystore-backed load (see `docs/ARCHITECTURE_OVERVIEW.md` "Known rough edges").
- [ ] Seed the collator's keystore with the `KeyService` sr25519 SURI so the feeds OCW can sign `deliver_unlock_unsigned`.
- [ ] Configure `ExistentialDeposit`, `StatementCost`, sponsorship `MinimumPotBalance`, and `MaxAppsPerOwner` for your target economy in `blockchain/runtime/src/configs/mod.rs`.
- [ ] Run benchmarks against production hardware and regenerate `weights.rs` per pallet.
- [ ] Set up monitoring on the collator (Prometheus on `:9615`).
