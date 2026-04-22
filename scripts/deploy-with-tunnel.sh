#!/usr/bin/env bash
# Local end-to-end DotNS deploy.
#
# Mirrors the GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`
# + `paritytech/dotns-sdk/.github/workflows/deploy.yml`) but runs every
# step on the developer's laptop. The flow:
#
#   1. Read the current ngrok tunnel (required — DotNS cannot reach
#      `ws://localhost:9944`).
#   2. `VITE_WS_URL=<tunnel> npm run build` — bundle the frontend.
#   3. `ipfs add` the `web/dist/` directory and `ipfs dag export`
#      it to a CAR file (CID v1 + raw-leaves, matching the workflow).
#   4. `dotns bulletin authorize <address>` — authorise the signer
#      on Paseo Bulletin.
#   5. `dotns bulletin upload build.car --resume --print-contenthash`
#      — upload to Bulletin and capture the CID.
#   6. `dotns lookup name <basename>` — register the base domain if
#      it does not exist yet (skipped unless `REGISTER_BASE=true`).
#   7. `dotns content set <basename> <cid>` — point the domain at the
#      new CID.
#
# Dependencies (all must be in PATH):
#   - node 22.x
#   - npm
#   - ngrok   (tunnel has to be running already)
#   - ipfs    (Kubo) — installed automatically on macOS/Linux if missing
#   - dotns   CLI (https://github.com/paritytech/dotns-sdk)
#
# Usage:
#   ./scripts/deploy-local.sh [basename]
#
# Env overrides:
#   DOTNS_MNEMONIC       BIP39 phrase for the signer (defaults to the
#                        Alice dev seed — only usable on Paseo testnet).
#   REGISTER_BASE=true   Register the base domain if it isn't owned yet.
#   SKIP_BUILD=true      Reuse an existing `web/dist/` (useful when
#                        iterating on deploy errors).
#   NGROK_API            ngrok local API (default: http://127.0.0.1:4040).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BASENAME="${1:-socialfi}"
NGROK_API="${NGROK_API:-http://127.0.0.1:4040/api/tunnels}"
# Alice dev seed — only safe for Paseo testnet. Override via env.
DEFAULT_DEV_MNEMONIC="bottom drive obey lake curtain smoke basket hold race lonely fit walk"
export DOTNS_MNEMONIC="${DOTNS_MNEMONIC:-$DEFAULT_DEV_MNEMONIC}"
REGISTER_BASE="${REGISTER_BASE:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"

# ── preflight ────────────────────────────────────────────────────────

for cmd in node npm dotns; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "[error] required command not found: $cmd"
        exit 1
    fi
done

if ! command -v ipfs >/dev/null 2>&1; then
    echo "[info] ipfs not found — installing via brew (macOS)"
    if command -v brew >/dev/null 2>&1; then
        brew install ipfs
    else
        echo "[error] install IPFS Kubo manually: https://docs.ipfs.tech/install/command-line/"
        exit 1
    fi
fi

# ── 1. resolve ngrok WS URL ──────────────────────────────────────────

if ! raw=$(curl -s --max-time 3 "$NGROK_API" 2>/dev/null); then
    echo "[error] cannot reach ngrok local API at $NGROK_API"
    echo "        is the tunnel running?  try: make tunnel"
    exit 1
fi

HTTPS_URL=$(
    python3 -c "
import json, sys
data = json.loads('''$raw''')
for t in data.get('tunnels', []):
    if t.get('public_url', '').startswith('https://'):
        print(t['public_url'])
        break
"
)

if [[ -z "$HTTPS_URL" ]]; then
    echo "[error] no https tunnel in ngrok output"
    exit 1
fi

WS_URL="${HTTPS_URL/https:/wss:}"

echo "[info] ngrok tunnel:   $HTTPS_URL"
echo "[info] WS for build:   $WS_URL"
echo "[info] DotNS basename: $BASENAME"
echo

# ── 2. build ─────────────────────────────────────────────────────────

if [[ "$SKIP_BUILD" == "true" && -d "$ROOT_DIR/web/dist" ]]; then
    echo "[step 2/7] skipping build (SKIP_BUILD=true and web/dist exists)"
else
    echo "[step 2/7] building frontend with VITE_WS_URL=$WS_URL"
    cd "$ROOT_DIR/web"
    VITE_WS_URL="$WS_URL" npm run build
    cd "$ROOT_DIR"
fi

# ── 3. CAR file ──────────────────────────────────────────────────────

echo "[step 3/7] exporting build/ as IPFS CAR"
ipfs init --profile server >/dev/null 2>&1 || true
CAR_CID=$(ipfs add -Q -r --cid-version=1 --raw-leaves --pin=false "$ROOT_DIR/web/dist")
ipfs dag export "$CAR_CID" > "$ROOT_DIR/build.car"
CAR_SIZE=$(stat -f '%z' "$ROOT_DIR/build.car" 2>/dev/null || stat --printf='%s' "$ROOT_DIR/build.car")
echo "[info] CAR CID:  $CAR_CID"
echo "[info] CAR size: $CAR_SIZE bytes"

# ── 4. authorise on Bulletin ─────────────────────────────────────────

echo "[step 4/7] authorising account on Bulletin"
ADDRESS=$(dotns account address)
echo "[info] signer address: $ADDRESS"
dotns bulletin authorize "$ADDRESS"

# ── 5. upload to Bulletin ────────────────────────────────────────────

echo "[step 5/7] uploading CAR to Bulletin"
UPLOAD_RESULT=$(
    dotns bulletin upload "$ROOT_DIR/build.car" \
        --resume \
        --print-contenthash \
        --json \
        --concurrency 4
)
CID=$(echo "$UPLOAD_RESULT" | python3 -c "import json, sys; print(json.load(sys.stdin).get('cid', ''))")
if [[ -z "$CID" ]]; then
    echo "[error] upload succeeded but no CID returned"
    echo "        raw response: $UPLOAD_RESULT"
    exit 1
fi
echo "[info] uploaded CID: $CID"

# ── 6. (optional) register base domain ───────────────────────────────

echo "[step 6/7] checking base domain ${BASENAME}.dot"
LOOKUP=$(dotns lookup name "$BASENAME" --json 2>&1 || true)
EXISTS=$(echo "$LOOKUP" | python3 -c "import json, sys; print(json.load(sys.stdin).get('exists', False))" 2>/dev/null || echo "False")

if [[ "$EXISTS" == "True" || "$EXISTS" == "true" ]]; then
    echo "[info] ${BASENAME}.dot is already registered"
elif [[ "$REGISTER_BASE" == "true" ]]; then
    echo "[info] registering ${BASENAME}.dot"
    dotns register domain --name "$BASENAME"
else
    echo "[error] ${BASENAME}.dot is not registered and REGISTER_BASE is not set"
    echo "        re-run with:  REGISTER_BASE=true make deploy-local"
    echo "        or register manually at https://dotns.paseo.li"
    exit 1
fi

# ── 7. set contenthash ───────────────────────────────────────────────

echo "[step 7/7] setting contenthash for $BASENAME → $CID"
dotns content set "$BASENAME" "$CID"

echo
echo "=== Deployment complete ==="
echo "  Domain: ${BASENAME}.dot"
echo "  CID:    $CID"
echo "  URL:    https://${BASENAME}.dot.li"
echo "  Direct: https://${BASENAME}.dot"
