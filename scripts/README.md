# Scripts

Convenience scripts for the local development, testing, and deployment flows.

All scripts resolve the repo root automatically, so you can run them from the repo root with:

```bash
./scripts/<script-name>.sh
```

`start-all.sh` is the recommended full local path — chain, CLI, and frontend together.

The local startup scripts coordinate the chain, CLI defaults, PAPI refresh, and frontend from shared environment variables.

By default they use:

- Substrate RPC: `ws://127.0.0.1:9944`
- Frontend: `http://127.0.0.1:5173`

To move a second local stack together, prefer:

```bash
STACK_PORT_OFFSET=100 ./scripts/start-all.sh
```

You can also override individual ports with `STACK_SUBSTRATE_RPC_PORT` and `STACK_FRONTEND_PORT`.

## Script Guide

| Script | What it does | When to use it |
| --- | --- | --- |
| `start-dev.sh` | Builds the runtime, generates `blockchain/chain_spec.json`, and starts a single local omni-node on the resolved Substrate RPC port using dev sealing. | Use this when you only need the fastest local pallet/runtime loop. On stable2512-3, this mode does not expose Statement Store RPCs. |
| `start-frontend.sh` | Installs frontend dependencies, refreshes PAPI descriptors if a local node is running on the resolved Substrate RPC port, and starts the Vite dev server on the resolved frontend port. | Use this when the chain is already running and you only want to work on the web app. |
| `start-all.sh` | Runs the full local stack through Zombienet: runtime build, chain-spec generation, relay chain + parachain startup, Statement Store-ready RPCs, CLI build, and frontend startup. | Use this when you want the one-command setup with all features working, including Statement Store notifications. |
| `start-local.sh` | Builds the runtime, regenerates `blockchain/chain_spec.json`, and starts the relay-backed Zombienet network using a temp config generated from the current port settings. | Use this when you want the relay-backed network directly, without the frontend setup steps. |
| `start-indexer.sh` | Starts the optional indexer service against the resolved Substrate RPC endpoint. | Use this when the frontend needs denormalised pallet events (earnings, tx-by-address). |
| `deploy-frontend.sh` | Builds the frontend and uploads `web/dist` to IPFS using the `w3` CLI, then prints the CID and suggested DotNS follow-up steps. | Use this when you want to publish the frontend as a static deployment. |
| `deploy-with-tunnel.sh` | Dispatches the frontend-deploy GitHub workflow with the current `ngrok` tunnel URL. | Use this when you want reviewers to hit your dev collator through a public tunnel. |
| `test-statement-store-smoke.sh` | Builds the runtime, starts a temporary Zombienet relay chain + collator, verifies the store is initially empty, submits a signed statement through the CLI, and checks that `statement-dump` returns it. | Use this for a focused end-to-end sanity check of the Statement Store integration. |
| `download-sdk-binaries.sh` | Downloads `polkadot` plus `polkadot-prepare-worker` / `polkadot-execute-worker` (required beside relay `polkadot`) and `polkadot-omni-node` from the stable2512-3 release into `./bin/` (gitignored). | Use this to prefetch SDK binaries, or rely on the same download step from `common.sh` unless disabled. |

## Notes

- Stack scripts default to **`STACK_DOWNLOAD_SDK_BINARIES=1`**: matching SDK binaries are placed under **`./bin/`** (ignored by git) and preferred over tools elsewhere on `PATH`. Set `STACK_DOWNLOAD_SDK_BINARIES=0` to only use binaries you installed yourself.
- `start-dev.sh` depends on local Rust and node tooling such as `cargo`, `chain-spec-builder`, and `polkadot-omni-node`.
- `start-all.sh`, `start-local.sh`, and `test-statement-store-smoke.sh` require both `polkadot` and `zombienet`.
- `deploy-frontend.sh` requires the `w3` CLI from Web3.Storage.
