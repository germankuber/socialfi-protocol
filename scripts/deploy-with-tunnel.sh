#!/usr/bin/env bash
# Deploy the frontend to DotNS with the current ngrok tunnel URL
# baked into the static bundle.
#
# Assumes:
#   1. `ngrok http 9944` is already running locally.
#   2. `gh` is installed and authenticated (`gh auth status`).
#
# Reads the public URL from the ngrok local API, dispatches the
# `Deploy Frontend to DotNS` workflow with that URL as `ws_url`, and
# tails the run until it finishes.
#
# Usage:
#   ./scripts/deploy-with-tunnel.sh [basename]
#
# If `basename` is omitted, defaults to the one pinned in the workflow.
set -euo pipefail

NGROK_API="${NGROK_API:-http://127.0.0.1:4040/api/tunnels}"
WORKFLOW_FILE=".github/workflows/deploy-frontend.yml"
DEFAULT_BASENAME="${DEFAULT_BASENAME:-socialfi-demo42}"

BASENAME="${1:-$DEFAULT_BASENAME}"

# 1. Pull the current ngrok https URL.
if ! raw=$(curl -s --max-time 3 "$NGROK_API" 2>/dev/null); then
    echo "[error] cannot reach the ngrok local API at $NGROK_API"
    echo "        is ngrok running?  try:  ngrok http 9944"
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

if [ -z "$HTTPS_URL" ]; then
    echo "[error] no https tunnel found in ngrok output"
    exit 1
fi

WS_URL="${HTTPS_URL/https:/wss:}"

echo "[info] ngrok public URL:  $HTTPS_URL"
echo "[info] ws URL for build:  $WS_URL"
echo "[info] DotNS basename:    $BASENAME"
echo

# 2. Make sure gh is ready.
if ! command -v gh >/dev/null 2>&1; then
    echo "[error] gh CLI not installed. install with: brew install gh"
    exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
    echo "[error] gh not authenticated. run:  gh auth login"
    exit 1
fi

# 3. Dispatch the workflow.
echo "[info] dispatching workflow..."
gh workflow run "$WORKFLOW_FILE" \
    -f "basename=$BASENAME" \
    -f "ws_url=$WS_URL" \
    -f "skip-cache=true"

echo "[info] waiting for run to start..."
sleep 4

# Grab the newest run id for this workflow.
RUN_ID=$(gh run list --workflow "$WORKFLOW_FILE" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "[info] run id: $RUN_ID"
echo "[info] url:    $(gh run view "$RUN_ID" --json url --jq '.url')"
echo
echo "[info] tailing (Ctrl+C to detach; the run keeps going on GitHub):"
gh run watch "$RUN_ID" --exit-status
