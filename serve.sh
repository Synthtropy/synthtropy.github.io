#!/usr/bin/env bash
# Serve this static site locally for previewing.
# Usage: ./serve.sh [port]   (default port: 8000)

set -euo pipefail

PORT="${1:-8000}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Serving $DIR at http://localhost:$PORT  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --directory "$DIR"
