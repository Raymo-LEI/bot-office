# Research: official bot roster / status / avatar interfaces

Date: 2026-11-06 (Asia/Tokyo). Scope: official or authorized paths only; no cookies, no undocumented internal HTTP, no credentials.

## Conclusion

There is **no** official HTTP/MCP API that the Pixel Office (a static browser page) can poll for real bot working status or avatars. The roster and appearance are maintained by hand in `data/org.json`; status falls back to `data/status.mock.json`.

## User-specified path (Cut6)

The user chose an optional **local** bridge: `tools/status-bridge/bridge.py` runs `grokbot status --json` on the user's own machine, using the user's own grokbot login, and writes only `{records:[{seatKey, working, source, updatedAt}]}` to `data/status.live.json`. This is not a browser-pollable official API and not a claim that an official live API exists. The `grokbot` CLI output is undocumented and may change with the client. Not for a public page.

## Official tools examined

| Path | Can read | Cannot read |
|------|----------|-------------|
| `SearchTeamBots` | Team Bot id/name/description/added | personal roster, working status, avatar images |
| `CreateAgent` / `UpdateAgent` | write own profile fields | bulk read of others' status |
| `UpdateAvatar` | set/clear this bot's own avatar | any bot's avatar URL for the page |
| `SendToAgent` | message delivery | status queries |
| `CheckSubagent` | progress of own subagents | whether teammates are working |
| Prompt teammate context | per-turn ids/descriptions | stable pollable API, avatars, status |
| Plugin catalog | no official roster/status/avatar connector | — |

## Local profile files

Local agent profile files exist on the shared machine but are internal configuration, not a documented API. They are **not** used as a status or appearance source, and nobody should read them (or desktop login/config folders, tokens, sessions) for this page.

## Field mapping

| Field | Official pollable? | Implementation |
|-------|--------------------|----------------|
| Roster | No | `data/org.json` seats (optional hidden `agentId`) |
| Working / not working | No | local bridge → `data/status.live.json`, else mock |
| Avatar | No | `avatarShape` / `avatarColor` / `avatarUrl` slots |
