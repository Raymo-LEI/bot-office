# Research: official bot roster / status / avatar interfaces

Scope: official or authorized paths only; no cookies, no desktop-app credentials, no client config files.

## Conclusion

There is **no** official HTTP/MCP API that this static browser page can poll for real bot working status or avatars. The roster and appearance are maintained by hand in `data/org.json`; status falls back to `data/status.mock.json`.

## Optional local bridge

An optional **local** bridge is available: `tools/status-bridge/bridge.py` runs on the user's own machine. After a one-time independent browser sign-in (`python3 tools/status-bridge/login.py`), it queries an **unpublished** backend for the user's bots and their status, and writes only `{records:[{seatKey, working, source, updatedAt}]}` to `data/status.live.json`. Earlier versions shelled out to an external command-line client; that dependency was removed. This is not a browser-pollable official API and not a claim that an official live API exists. The backend may change without notice. Not for a public page. Flow details: [connect-status-notes.md](connect-status-notes.md).

## Official tools examined

| Path | Can read | Cannot read |
|------|----------|-------------|
| Team Bot search | Team Bot id/name/description/added | personal roster, working status, avatar images |
| Agent create / update | write own profile fields | bulk read of others' status |
| Avatar update | set/clear this bot's own avatar | any bot's avatar URL for the page |
| Agent messaging | message delivery | status queries |
| Own subagent progress | progress of own subagents | whether teammates are working |
| Prompt teammate context | per-turn ids/descriptions | stable pollable API, avatars, status |
| Plugin catalog | no official roster/status/avatar connector | — |

## Local profile files

Local agent profile files and the desktop app's stored login may exist on a machine, but they are internal, not a documented API. They are **not** used as a status or appearance source, and the bridge never reads them; it keeps its own session.

## Field mapping

| Field | Official pollable? | Implementation |
|-------|--------------------|----------------|
| Roster | No | `data/org.json` seats |
| Working / not working | No | local bridge → `data/status.live.json`, else mock |
| Avatar | No | `avatarShape` / `avatarColor` / `avatarUrl` slots |
