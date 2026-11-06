#!/bin/bash
# Shared helpers for start-office.command and stop-office.command.
# PATH bootstrap only — never reads Grok Bot config, tokens, or sessions.

office_init() {
  if [ -z "${ROOT:-}" ]; then
    echo "Error: ROOT is not set." >&2
    return 1
  fi
  RUN_DIR="$ROOT/.run"
  SERVER_PID_FILE="$RUN_DIR/server.pid"
  BRIDGE_PID_FILE="$RUN_DIR/bridge.pid"
  PORT_FILE="$RUN_DIR/port"
  STARTED_SERVER=0
  STARTED_BRIDGE=0
  REUSED_SERVER=0
  PORT=""
}

office_verify() {
  if [ ! -f "$ROOT/index.html" ] || [ ! -f "$ROOT/tools/status-bridge/bridge.py" ]; then
    echo "Error: This launcher must be run from the pixel-office folder." >&2
    echo "Missing index.html or tools/status-bridge/bridge.py next to the script." >&2
    return 1
  fi
}

office_bootstrap_path() {
  export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"
  local here="$ROOT"
  set +eu
  if [ -f "$HOME/.zprofile" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.zprofile" || true
  fi
  if [ -f "$HOME/.bash_profile" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.bash_profile" || true
  fi
  if command -v brew >/dev/null 2>&1; then
    eval "$(brew shellenv)" || true
  fi
  set -eu
  cd "$here"
  export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"
}

office_require_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 was not found after PATH setup. Install Python 3 and try again." >&2
    return 1
  fi
}

office_pid_alive() {
  local pid="${1:-}"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

office_read_pid() {
  local file="$1"
  if [ -f "$file" ]; then
    tr -d '[:space:]' < "$file"
  fi
}

office_port_listening() {
  local port="$1"
  python3 - "$port" <<'ENDPY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(("0.0.0.0", port))
    sys.exit(1)  # bind succeeded: port is free
except OSError:
    sys.exit(0)  # bind failed: port is in use
finally:
    s.close()
ENDPY
}

office_http_ok() {
  local port="$1" code
  if command -v curl >/dev/null 2>&1; then
    code=$(curl -s -o /dev/null --connect-timeout 1 --max-time 2 -w '%{http_code}' "http://127.0.0.1:${port}/" 2>/dev/null || true)
    [ -n "$code" ] && [ "$code" != "000" ]
  else
    python3 - "$port" <<'ENDPY'
import sys
from urllib.error import HTTPError
from urllib.request import urlopen
port = int(sys.argv[1])
try:
    urlopen("http://127.0.0.1:%d/" % port, timeout=2)
    sys.exit(0)
except HTTPError:
    sys.exit(0)
except Exception:
    sys.exit(1)
ENDPY
  fi
}

office_wait_http() {
  local port="$1" i
  i=0
  while [ "$i" -lt 40 ]; do
    if office_http_ok "$port"; then
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  return 1
}

office_pick_port() {
  PORT=8765
  REUSED_SERVER=0
  if office_port_listening 8765; then
    if office_http_ok 8765; then
      PORT=8765
      REUSED_SERVER=1
      echo "Port 8765 is already in use; opening the existing server."
      return 0
    fi
    local p
    for p in 8766 8767 8768; do
      if office_port_listening "$p"; then
        if office_http_ok "$p"; then
          PORT="$p"
          REUSED_SERVER=1
          echo "Port $p is already serving HTTP; opening http://127.0.0.1:${p}/"
          return 0
        fi
      else
        PORT="$p"
        REUSED_SERVER=0
        echo "Port 8765 is busy (not an HTTP server). Starting the page at http://127.0.0.1:${p}/"
        return 0
      fi
    done
    echo "Error: ports 8765-8768 are unavailable." >&2
    return 1
  fi
  PORT=8765
  REUSED_SERVER=0
}

office_live_unavailable() {
  echo "Live status is unavailable (not signed in, or the status query failed). The page will use mock status."
  echo "To enable live status, run once from the pixel-office folder: python3 tools/status-bridge/login.py"
  echo "Details: .run/bridge.log"
}

office_login_hint() {
  if [ ! -f "$ROOT/tools/status-bridge/session.json" ]; then
    echo "Status bridge: not signed in yet, so the page uses mock status."
    echo "Run once from the pixel-office folder: python3 tools/status-bridge/login.py"
    echo "The running bridge picks up the new sign-in on its next poll."
  fi
}

office_start_server() {
  mkdir -p "$RUN_DIR"
  echo "$PORT" > "$PORT_FILE"
  if [ "$REUSED_SERVER" -eq 1 ]; then
    return 0
  fi
  python3 -m http.server "$PORT" >"$RUN_DIR/server.log" 2>&1 &
  local spid=$!
  echo "$spid" > "$SERVER_PID_FILE"
  sleep 0.3
  if office_pid_alive "$spid"; then
    STARTED_SERVER=1
  else
    rm -f "$SERVER_PID_FILE"
    echo "Error: could not start python3 -m http.server on port ${PORT}." >&2
    return 1
  fi
}

office_start_bridge() {
  mkdir -p "$RUN_DIR"
  local existing
  existing=$(office_read_pid "$BRIDGE_PID_FILE")
  if office_pid_alive "$existing"; then
    echo "Status bridge is already running (PID ${existing})."
    return 0
  fi
  python3 tools/status-bridge/bridge.py >"$RUN_DIR/bridge.log" 2>&1 &
  local bpid=$!
  sleep 0.4
  if office_pid_alive "$bpid"; then
    echo "$bpid" > "$BRIDGE_PID_FILE"
    STARTED_BRIDGE=1
    office_login_hint
  else
    rm -f "$BRIDGE_PID_FILE"
    office_live_unavailable
  fi
}

office_open_browser() {
  local url="http://127.0.0.1:${PORT}/"
  if ! office_wait_http "$PORT"; then
    echo "Warning: the server did not answer HTTP in time. Opening ${url} anyway."
  fi
  echo "Office URL: ${url}"
  local uname_s
  uname_s=$(uname -s)
  if [ "$uname_s" = "Darwin" ]; then
    open "$url" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  else
    echo "Open ${url} in your browser."
  fi
}

office_our_server_running() {
  local pid
  pid=$(office_read_pid "$SERVER_PID_FILE")
  office_pid_alive "$pid"
}

office_stop_pid_file() {
  local file="$1"
  local label="$2"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local pid
  pid=$(office_read_pid "$file")
  if [ -z "$pid" ]; then
    rm -f "$file"
    return 0
  fi
  if office_pid_alive "$pid"; then
    kill "$pid" 2>/dev/null || true
    local i=0
    while [ "$i" -lt 20 ]; do
      office_pid_alive "$pid" || break
      sleep 0.15
      i=$((i + 1))
    done
    if office_pid_alive "$pid"; then
      kill -KILL "$pid" 2>/dev/null || true
      sleep 0.1
    fi
    if office_pid_alive "$pid"; then
      echo "Could not stop ${label} (PID ${pid})."
    else
      echo "Stopped ${label} (PID ${pid})."
    fi
  else
    echo "${label} (PID ${pid}) was not running."
  fi
  rm -f "$file"
}

office_cleanup_started() {
  echo
  echo "Stopping the office processes started by this window..."
  if [ "${STARTED_SERVER:-0}" -eq 1 ]; then
    office_stop_pid_file "$SERVER_PID_FILE" "page server"
  fi
  if [ "${STARTED_BRIDGE:-0}" -eq 1 ]; then
    office_stop_pid_file "$BRIDGE_PID_FILE" "status bridge"
  fi
  exit 0
}

office_print_status() {
  echo "Office URL: http://127.0.0.1:${PORT}/"
  if [ "$STARTED_SERVER" -eq 1 ]; then
    echo "Page server PID: $(office_read_pid "$SERVER_PID_FILE")"
  elif [ "$REUSED_SERVER" -eq 1 ]; then
    echo "Page server: reused existing HTTP server on port ${PORT}"
  fi
  if [ "$STARTED_BRIDGE" -eq 1 ]; then
    echo "Status bridge PID: $(office_read_pid "$BRIDGE_PID_FILE")"
  else
    echo "Live status: unavailable"
  fi
}

office_start() {
  office_init
  cd "$ROOT"
  office_verify
  office_bootstrap_path
  office_require_python
  office_init

  if office_our_server_running; then
    PORT=$(tr -d '[:space:]' < "$PORT_FILE" 2>/dev/null || true)
    [ -n "$PORT" ] || PORT=8765
    echo "The office stack is already running."
    office_open_browser
    exit 0
  fi

  office_pick_port
  office_start_server
  office_start_bridge
  office_open_browser

  if [ "$STARTED_SERVER" -eq 0 ] && [ "$STARTED_BRIDGE" -eq 0 ]; then
    echo "The office stack is already running."
    exit 0
  fi

  office_print_status
  echo "This window keeps the office stack running. Press Ctrl+C to stop."
  trap 'office_cleanup_started' INT TERM

  local wait_pids=""
  if [ "$STARTED_SERVER" -eq 1 ]; then
    wait_pids="$wait_pids $(office_read_pid "$SERVER_PID_FILE")"
  fi
  if [ "$STARTED_BRIDGE" -eq 1 ]; then
    wait_pids="$wait_pids $(office_read_pid "$BRIDGE_PID_FILE")"
  fi
  set +e
  # shellcheck disable=SC2086
  wait $wait_pids
  set -e
}

office_stop() {
  office_init
  cd "$ROOT"
  if [ ! -d "$RUN_DIR" ]; then
    echo "Nothing to stop (no .run directory)."
    return 0
  fi
  office_stop_pid_file "$SERVER_PID_FILE" "page server"
  office_stop_pid_file "$BRIDGE_PID_FILE" "status bridge"
  echo "Stop finished. (Ctrl+C in the starter window also stops only the processes that window started; it never kills a reused pre-existing server.)"
}
