# Scripts

Convenience shell scripts backing the `make` targets. **Prefer
`make` over calling these directly** — the Makefile is the canonical
entry point (`make help`).

## Scripts

| Script | Role |
| --- | --- |
| `start-dev.sh` | Build the runtime, generate `blockchain/chain_spec.json`, launch a solo dev node. No Statement Store RPCs on stable2512-3. |
| `start-local.sh` | Relay-backed Zombienet network (no frontend). |
| `start-all.sh` | Full stack: relay chain + collator + frontend in one go. Statement Store works end-to-end here. |
| `start-frontend.sh` | Installs deps, refreshes PAPI descriptors against the running node, runs Vite. |
| `start-indexer.sh` | Starts the optional indexer against the resolved Substrate RPC endpoint. |
| `deploy-with-tunnel.sh` | **Fully local** DotNS deploy: reads the ngrok tunnel, builds with `VITE_WS_URL`, IPFS-CAR export, Bulletin upload, contenthash. No GitHub Actions. |
| `deploy-frontend.sh` | Legacy — uploads `web/dist` to IPFS via `w3cli`. |
| `test-statement-store-smoke.sh` | Boots a Zombienet relay + collator, submits and dumps a statement via the CLI. |
| `download-sdk-binaries.sh` | Pre-fetches pinned SDK binaries (`polkadot*`, `polkadot-omni-node`) into `./bin/` (gitignored). |
| `common.sh` | Sourced by the others — shared env, ports, downloads. |

## Ports

- Substrate RPC: `ws://127.0.0.1:9944`
- Frontend: `http://127.0.0.1:5173`
- Indexer HTTP API: `http://127.0.0.1:3001`

Run two stacks in parallel with `STACK_PORT_OFFSET=100 make <target>`,
or override individually with `STACK_SUBSTRATE_RPC_PORT` /
`STACK_FRONTEND_PORT`.

## Requirements

- `cargo`, `chain-spec-builder`, `polkadot-omni-node` — all of
  `start-dev.sh` / `start-local.sh` / `start-all.sh`.
- `polkadot` + `zombienet` — `start-all.sh`, `start-local.sh`,
  `test-statement-store-smoke.sh`.
- `ngrok`, `ipfs` (Kubo), `dotns` CLI — `deploy-with-tunnel.sh`.
- `w3cli` — `deploy-frontend.sh` (legacy path).

Missing binaries? Stack scripts default to
`STACK_DOWNLOAD_SDK_BINARIES=1` which drops them under `./bin/`.
Set to `0` to use your own `$PATH`.
