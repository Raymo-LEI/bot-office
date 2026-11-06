# Cut12 evidence

Protocol and auth flow notes: [../docs/connect-status-notes.md](../docs/connect-status-notes.md).

Re-run from the `pixel-office` folder (no network, no sign-in):

- `python3 tools/status-bridge/test_bridge.py` → `cut12-tests.log`
- Mapping demo, login-missing, and query-failure runs use a temporary tree with a synthetic org (fake UUIDs) → `cut12-mapping.log`, `cut12-login-missing.log`, `cut12-query-failure.log`.
