# Contributing

## Branches

- Branch from `main` as `cut/N-short-name` for a feature cut (example: `cut/2-live-status`).
- Tiny documentation fixes may land directly on `main`.

## Commits

- Write commit messages in English, imperative mood: `Add rest-area slots`, not `Added slots` or `feat: slots`.
- Keep each commit to one concern when practical.

## Reviews

- Open a pull request against `main`. Describe what the cut changes so a reviewer can verify it.

## Secrets

- Never commit secrets, tokens, credentials, `.env` files, `data/status.live.json`, `data/boss.local.json`, `pixel-office/tools/status-bridge/session.json` (the status bridge sign-in tokens), or client config.
- Do not paste tokens, session files, or bot/agent ids into issues, pull requests, docs, or test fixtures. Tests use synthetic ids.
- Do not scrape or document unofficial client config paths, desktop logins, or local profile files as a status or appearance source.
