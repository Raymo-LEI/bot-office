# Bot Office

Bot Office is a static pixel-office visualizer for one building of bots. Floors are **3F Heads**, **2F PMs**, **1F Workers**, and **4F Boss’s Suite**, with **Optics**, **Painting**, and **Office** wings. The page is plain HTML, CSS, and JavaScript — no framework and no build step. Rooms, desks, and the break area come from `pixel-office/data/org.json`.

## Status at a glance

A person is drawn in one of two places:

- **Working** — at their computer desk
- **Not working** — in that floor’s break area

Vacant seats stay empty. Names follow people. The page does not show a third status badge.

## Run

### macOS (one-click)

1. Clone this repository onto your Mac.
2. In Finder, open the `pixel-office` folder and double-click `start-office.command`.

The first time, macOS Gatekeeper may block the file. Right-click `start-office.command` and choose **Open**, then confirm. If a downloaded copy is still blocked, from the `pixel-office` folder run:

```sh
xattr -d com.apple.quarantine start-office.command
xattr -d com.apple.quarantine stop-office.command
```

You can optionally drag `start-office.command` to the Dock.

To stop, press **Ctrl+C** in the Terminal window that started the stack, or double-click `pixel-office/stop-office.command`.

### Any machine (manual)

From the repository root:

```bash
cd pixel-office && python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

HTTP is required so the page can fetch JSON; `file://` will not work. Floor buttons or keys **1–4** switch the plan.

Details, port fallback (8766–8768), and the optional status bridge: [pixel-office/README.md](pixel-office/README.md).

## Live status (optional, local only)

There is **no** official browser-pollable status API. On your own machine, with your own grokbot login, you can run the bundled bridge so it polls `grokbot status --json` and writes a gitignored live status file. Without the CLI (or if the bridge fails), the page still runs on mock data. The static page never reads desktop logins, client config, tokens, or sessions.

## What’s in the repo

- `pixel-office/` — the interactive visualizer (detailed guide: [pixel-office/README.md](pixel-office/README.md))
- `cut0/` — early isometric concept art and notes (not the current look)
- `docs/` — short pointer to the status/API research note
- `CONTRIBUTING.md` — branch and commit conventions
- `LICENSE` — MIT

## License

[MIT](LICENSE)
