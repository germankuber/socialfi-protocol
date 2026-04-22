.PHONY: help node node-quiet frontend indexer tunnel deploy-frontend deploy-with-tunnel

# RUST_LOG filter for `make node-quiet`:
# * base = info        → keeps every pallet log + state-change message
# * noisy targets = off → hides the consensus/block-import/idle spam
#                         that otherwise drowns the console once
#                         manual-seal / aura start producing blocks.
# Must stay on a SINGLE line: `make` expands line-continuations to a
# space, and `env_logger` silently ignores directives that contain
# whitespace, which would defeat the filter.
NODE_LOG_FILTER := info,substrate=warn,sc_basic_authorship=off,manual_seal=off,sc_consensus=off,sc_consensus_aura=off,sc_consensus_manual_seal=off,sc_consensus_slots=off,parity_db=off,db=off,sync=off,sub_libp2p=off,peerset=off,telemetry=off,trie=off,wasm-heap=off,wasm_overrides=off,runtime::system=off,runtime::offchain=off,polkadot_omni_node_lib::nodes::aura=off,parachain=off,txpool=off,aura::cumulus=off,collator=off

help:
	@echo "SocialFi Protocol — run each in a separate terminal:"
	@echo ""
	@echo "  make node                Start the Substrate dev node (full logs)"
	@echo "  make node-quiet          Start the node muting consensus noise —"
	@echo "                           shows only warn+ globally, info for our pallets"
	@echo "  make frontend            Start the React frontend"
	@echo "  make indexer             Start the event indexer"
	@echo ""
	@echo "  make tunnel              Open an ngrok HTTPS tunnel to the node WS port"
	@echo "                           (must be running before deploy-with-tunnel)"
	@echo "  make deploy-with-tunnel  Full local DotNS deploy via the current ngrok"
	@echo "                           tunnel — build, IPFS CAR, Bulletin upload,"
	@echo "                           contenthash (basename: socialfi)"
	@echo "  make deploy-frontend     Legacy — upload the frontend to IPFS via w3cli"

node:
	./scripts/start-dev.sh

node-quiet:
	@echo "🔇 node-quiet: filtering logs to $(NODE_LOG_FILTER)"
	RUST_LOG="$(NODE_LOG_FILTER)" ./scripts/start-dev.sh

frontend:
	./scripts/start-frontend.sh

indexer:
	./scripts/start-indexer.sh

tunnel:
	@command -v ngrok >/dev/null 2>&1 || { \
		echo "[error] ngrok not installed — get it from https://ngrok.com/download"; \
		exit 1; \
	}
	ngrok http 9944

deploy-with-tunnel:
	./scripts/deploy-with-tunnel.sh

deploy-frontend:
	./scripts/deploy-frontend.sh
