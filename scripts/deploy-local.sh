#!/usr/bin/env bash
# Full end-to-end deploy from your laptop — no GitHub Actions involved.
#
# What this script does (mirrors the `.github/workflows/deploy-frontend.yml`
# pipeline, but running everything locally):
#
#   1. Read the current ngrok public URL from the ngrok admin API.
#   2. Build the frontend with VITE_WS_URL / VITE_ETH_RPC_URL set to
#      that tunnel URL.
#   3. Add the build dir to a local IPFS node, export it as a CAR file.
#   4. Install the `@parity/dotns-cli` (first run only) and use it to
#      upload the CAR to the Polkadot Bulletin chain on Paseo.
#   5. Register the DotNS base domain if it isn't owned yet, then set
#      its contenthash to the uploaded CID.
#
# Requirements (install once):
#   - Node.js 22 + npm          (brew install node)
#   - ipfs (kubo)               (brew install ipfs)
#   - curl, jq, python3         (already on macOS)
#   - ngrok tunnel running on localhost:9944
#
# Env vars (optional — see defaults below):
#   BASENAME        DotNS basename (must be 9+ letters + 2 digits)
#   DOTNS_MNEMONIC  BIP39 mnemonic (defaults to //Alice dev seed)
#   NGROK_API       where to find ngrok's local admin API
#
# Example:
#   BASENAME=socialfi-demo42 ./scripts/deploy-local.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BASENAME="${BASENAME:-polkadot-stack-template00}"
NGROK_API="${NGROK_API:-http://127.0.0.1:4040/api/tunnels}"
# Alice dev seed — register-free on Paseo. Override for production runs.
DOTNS_MNEMONIC="${DOTNS_MNEMONIC:-bottom drive obey lake curtain smoke basket hold race lonely fit walk}"
export DOTNS_MNEMONIC

say()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. tunnel URL ────────────────────────────────────────────────────
say "reading ngrok tunnel URL from $NGROK_API ..."
if ! raw=$(curl -s --max-time 3 "$NGROK_API"); then
    die "ngrok admin API not reachable. run:  ngrok http 9944"
fi
HTTPS_URL=$(
    python3 -c "
import json, sys
data = json.loads('''$raw''')
for t in data.get('tunnels', []):
    if t.get('public_url', '').startswith('https://'):
        print(t['public_url']); break
"
)
[ -n "$HTTPS_URL" ] || die "no https tunnel found in ngrok output"
WS_URL="${HTTPS_URL/https:/wss:}"
say "tunnel URL: $HTTPS_URL  →  ws $WS_URL"

# ── 2. build ─────────────────────────────────────────────────────────
say "installing web deps ..."
cd "$ROOT_DIR/web"
if [ ! -d node_modules ]; then
    npm ci --silent
fi

say "building frontend with VITE_WS_URL=$WS_URL ..."
VITE_WS_URL="$WS_URL" VITE_ETH_RPC_URL="$HTTPS_URL" npm run build
[ -d "$ROOT_DIR/web/dist" ] || die "build produced no dist/ directory"
say "build output: $ROOT_DIR/web/dist"

# ── 3. IPFS CAR ──────────────────────────────────────────────────────
command -v ipfs >/dev/null || die "ipfs (kubo) not installed. run:  brew install ipfs"

IPFS_PATH="${IPFS_PATH:-$ROOT_DIR/.ipfs}"
export IPFS_PATH
if [ ! -f "$IPFS_PATH/config" ]; then
    say "initialising a local ipfs repo at $IPFS_PATH ..."
    ipfs init --profile server >/dev/null
fi

say "adding build to ipfs ..."
CID=$(ipfs add -Q -r --cid-version=1 --raw-leaves --pin=false "$ROOT_DIR/web/dist")
say "IPFS CID: $CID"

CAR_FILE="$ROOT_DIR/.deploy-cache/build.car"
mkdir -p "$(dirname "$CAR_FILE")"
ipfs dag export "$CID" > "$CAR_FILE"
say "CAR file: $CAR_FILE ($(du -h "$CAR_FILE" | cut -f1))"

# ── 4. DotNS CLI ─────────────────────────────────────────────────────
if ! command -v dotns >/dev/null 2>&1; then
    say "installing @parity/dotns-cli globally (first-run only) ..."
    npm install -g @parity/dotns-cli >/dev/null
fi

# Bulletin authorize — one-shot per sender address.
ADDRESS=$(dotns account address 2>/dev/null || true)
if [ -n "$ADDRESS" ]; then
    say "bulletin: authorising $ADDRESS ..."
    dotns bulletin authorize "$ADDRESS" --json --reporter stream || warn "authorize step returned non-zero (ok if already authorised)"
fi

say "bulletin: uploading CAR ..."
UPLOAD_JSON=$(dotns bulletin upload "$CAR_FILE" --json)
UPLOADED_CID=$(echo "$UPLOAD_JSON" | jq -r '.cid // empty')
[ -n "$UPLOADED_CID" ] || die "bulletin upload did not return a CID: $UPLOAD_JSON"
say "bulletin CID: $UPLOADED_CID"

# ── 5. DotNS register + contenthash ──────────────────────────────────
say "checking if $BASENAME.dot is already registered ..."
LOOKUP=$(dotns lookup name "$BASENAME" --json 2>/dev/null || echo '{}')
EXISTS=$(echo "$LOOKUP" | jq -r '.exists // false')

if [ "$EXISTS" != "true" ]; then
    say "registering $BASENAME.dot ..."
    dotns register domain --name "$BASENAME"
else
    OWNER=$(echo "$LOOKUP" | jq -r '.owner')
    say "$BASENAME.dot already registered (owner: $OWNER)"
fi

say "setting contenthash for $BASENAME.dot to $UPLOADED_CID ..."
dotns content set "$BASENAME" "$UPLOADED_CID"

# ── done ─────────────────────────────────────────────────────────────
cat <<EOF

─── Done ───────────────────────────────────────────────────────────
  dotli host:  https://$BASENAME.dot.li
  dotli path:  https://dot.li/$BASENAME.dot
  direct:      https://$BASENAME.dot
  CID:         $UPLOADED_CID
  ws_url:      $WS_URL
────────────────────────────────────────────────────────────────────

As long as ngrok stays up at $HTTPS_URL, the deployed frontend will
connect to your local node. If you restart ngrok and get a different
URL, re-run this script to rebuild+redeploy with the new URL.
EOF
