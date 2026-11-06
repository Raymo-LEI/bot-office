# Local status bridge: sign-in and query flow

These notes describe what `tools/status-bridge/` does. The backend it talks to is **unpublished**, is not an official API, and may change at any time. The flow follows public third-party notes about the same client protocol; the code here is an original, stdlib-only Python implementation.

## Files

| File | Role |
| --- | --- |
| `login.py` | One-time browser sign-in |
| `bridge.py` | Polls status and writes `data/status.live.json` |
| `connect_client.py` | Session file, token renewal, request headers, unary calls |
| `fixture.json` | Synthetic status response (fake ids) for offline demos |
| `test_bridge.py` | Offline tests (mapping, failure paths, headers) |
| `session.json` | Created by `login.py`; tokens + a locally generated machine id. Mode `0600`, gitignored, never committed |

## Sign-in (independent session)

1. Generate a random verifier (32 bytes, base64url), its SHA-256 challenge (base64url), and a random login UUID.
2. Open the browser at the sign-in page with the challenge, UUID, `mode=login` and `redirectTarget=cli`.
3. Poll the auth endpoint about once a second with the UUID and verifier: 404 means "not yet", 200 returns an access token, a refresh token and an auth id, 403 means refused. Give up after about 10 minutes.
4. Save the tokens and a freshly generated 64-hex machine id to `session.json` (mode `0600`).
5. Confirm with one `DashboardService/GetMe` call and print only "Signed in." No names, emails, tokens, or ids are printed.

This is a separate session. It never reads, reuses, or refreshes the desktop app's login, its keychain entry, or its config folders.

## Token renewal

Before each call, if the access token (a JWT) expires within 60 seconds, the bridge renews it with a refresh-token grant against the OAuth token endpoint (using the public client id documented for this flow). On an HTTP 401 / `unauthenticated` reply it renews once and retries once. If the server answers with `shouldLogout`, or renewal is refused, the session is treated as signed out.

## Unary calls

`POST https://api2.cursor.sh/aiserver.v1.<Service>/<Method>` with a JSON body, `Content-Type: application/json` and `Connect-Protocol-Version: 1`, plus client headers: bearer token, a desktop-style user agent containing `Sand/<version>`, client type/version/OS/source, box namespace, ghost mode, a random request id, and a checksum header. The client version defaults to `0.75.0` and may be overridden with `OFFICE_CONNECT_CLIENT_VERSION`; the installed app is never inspected.

Checksum: take the current time in milliseconds divided by 1,000,000 (floored), encode it as 6 big-endian bytes, scramble each byte with the previous scrambled byte (starting from 165) plus its index, base64url-encode without padding, then append the machine id.

Only three RPCs are allowed by the client: `DashboardService/GetMe`, `GrokBotService/ListGrokBotAgents`, `GrokBotService/ListGrokBotAgentStatuses`. Nothing is sent to, started on, or stopped on any bot.

## Status query and mapping

1. `ListGrokBotAgents {}` → collect each agent's UUID (a UUID-shaped `agentId` is preferred over a numeric `id`).
2. `ListGrokBotAgentStatuses {"agentIds": [...]}` → one row per agent.
3. State per row:
   - `live.awaiting` present → awaiting you
   - else `live.isRunning` or `isRunning` → running
   - else non-empty `subagents` or `workingTaskIds` (on the row or in `live`) → idle, background work
   - else → idle
4. Office visual: running or background work → `working: true` (desk); awaiting you or idle → `working: false` (break area).
5. Join to occupied seats in `data/org.json` by their hidden `agentId` (case-insensitive). Vacant seats, seats with no `agentId` (including the 4F Boss), and unmapped agents get no record.
6. Write `{records:[{seatKey, working, source:"live", updatedAt}]}` atomically. Raw responses are never written.

## Failure behavior

If there is no session, the session is rejected, or any query fails, the bridge removes `data/status.live.json` (so the page falls back to mock) and prints an English message on stderr. `--once` exits non-zero (2 = not signed in, 1 = query failed). The polling loop keeps running, so signing in later from another terminal starts live updates without restarting the page.
