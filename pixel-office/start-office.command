#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
HELPER="$ROOT/tools/office-stack/stack.sh"
if [ ! -f "$HELPER" ]; then
  echo "Error: missing helper: $HELPER" >&2
  exit 1
fi
# shellcheck disable=SC1090
. "$HELPER"
office_start
