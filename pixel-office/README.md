# Bot Office (`pixel-office/`)

This directory is the interactive visualizer: a pure static HTML/CSS/JavaScript office with no frameworks or build step. There is no official browser-pollable status API; an optional local status bridge can write status on your own machine (see [Local status bridge](#local-status-bridge-optional)).

## Run

### macOS (one-click)

1. Clone this repository onto your Mac.
2. In Finder, open the `pixel-office` folder and double-click `start-office.command`.

The first time macOS may block the file (Gatekeeper). Right-click `start-office.command` and choose **Open**, then confirm. If a downloaded copy is still blocked, run this from the `pixel-office` folder:

```sh
xattr -d com.apple.quarantine start-office.command
xattr -d com.apple.quarantine stop-office.command
```

You can optionally drag `start-office.command` to the Dock.

The launcher starts `python3 -m http.server` from this folder (default URL http://127.0.0.1:8765/) and the local status bridge `python3 tools/status-bridge/bridge.py` (15 second poll). It then opens the page in your browser. Finder-launched Terminal windows often have a thin PATH, so the script adds Homebrew locations and sources `~/.zprofile` / `~/.bash_profile` when they exist (**PATH only** — it never reads Grok Bot config files, tokens, or sessions).

Live status needs a one-time sign-in on this machine (see [Local status bridge](#local-status-bridge-optional)):

```sh
python3 tools/status-bridge/login.py
```

If you have not signed in, or the status query fails, the page still opens and uses mock status. The launcher prints a hint, and a bridge that is already running picks up a later sign-in on its next poll.

If port 8765 is already serving HTTP, the launcher reuses it and says so. If something else is using 8765, it tries 8766, then 8767, then 8768, and prints the URL it chose.

To stop, press **Ctrl+C** in the Terminal window that started the stack, or double-click `stop-office.command`. Either action stops only processes this launcher started. They will not kill an HTTP server that was already running.

On macOS, double-clicking a `.command` file opens Terminal and runs the same script. On Linux you can run `bash start-office.command` (the browser opens with `xdg-open` if available; otherwise the URL is printed).

### Manual server (any machine)

From this folder (or `cd pixel-office` from the repository root):

```sh
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/ in a browser. HTTP is required for JSON fetches; `file://` will not work. Press **1–4** to switch floors, or click a floor button.

Optional live status (own machine, after the one-time sign-in):

```sh
python3 tools/status-bridge/login.py    # once
python3 tools/status-bridge/bridge.py   # keep running next to the server
```

## Status

Binary placement only:

- `working: true` places a person at their computer desk.
- `working: false`, an away state, or a missing/unknown record places a person in the break area.
- Open seats (`vacant: true`) retain a desk and empty chair but never show a person.
- An away person’s desk has a grey `(Away)` badge and dimmed chair; their name follows them to the break area.

Details:

- Schema: `data/status.schema.json`, shaped as `{"records":[{seatKey, working, source, updatedAt}]}`. `state: "working" | "away"` is also accepted.
- Seat key: `floor|department|id` when a seat has an optional `id` (used for the 1F Open desks, e.g. `1F|optics|optics-1`); otherwise `floor|department|title`.
- Mock data: `data/status.mock.json`. Open seats use their `id` in the key (`1F|optics|optics-1`…`optics-4`, `1F|painting|painting-2`…`painting-4`, `1F|office|office-1`…`office-4`); other seats use `floor|department|title`.
- Loader: `js/status.js` exposes `window.StatusAPI` (`STATUS_URL`, `loadStatus`, `seatKey`, `isWorking`).
- The page fetches `data/status.live.json` first and falls back to `data/status.mock.json` if it is missing or invalid; it re-fetches every 15 s.
- The page only reads that JSON and never reads desktop logins, config folders, tokens, or sessions.

There is **no** official browser-pollable status API. Live status needs your own machine, a one-time sign-in, and the bridge below. If you are not signed in or the query fails, mock data is used.

## Organization and layout

`data/org.json` drives floors, departments, groups, seats, and geometry. Floors **1F–3F** share the same **1100×640** `layout`: a core, corridor, lobby, three department rooms, a break area, and an east wing that is still under construction. Floor **4F** overrides that shared layout with `layoutByFloor["4F"]` (the Boss’s Suite — see below). Seats are placed in department order at that department’s `deskSlots`. People who are not working use `restSlots`; Open seats have no person.

To add an optional project group:

1. Add a group such as `{"id":"g-lens","name":"Lens group"}` to `groups`.
2. Set `"groupId":"g-lens"` on the relevant seat.

Departments use `{id, name, color}`. Their color is a rug and wall-trim accent, not a full-room wash. Geometry lives in `layout` (`core`, `corridor`, `lobby`, `rooms`, `deskSlots`, `rest`, `restSlots`, `construction`). Keep slots inside their rooms and allow space for character nameplates.

**Slots vs seats:** each department room has **6 desk slots** (3 columns × 2 rows, filled column by column so the first four seats form a 2×2 block), and the break area has **10 rest slots** (2 columns × 5 rows). Adding a seat to `seats` is enough until a department passes six people. Today **1F** reserves **12 seats** (four per department); **2F** and **3F** have one seated role per department, with empty slots to grow.

`construction` is a list of `{x, y, w, h, label, note}` areas drawn as a fenced-off building site with hazard tape, scaffolding, materials and decorative worker bots in hard hats. Nobody can be seated there, and the corridor is barricaded where it meets the site. When a wing is ready, remove its `construction` entry and add a room plus `deskSlots` in its place.

Optional per-floor override: `layoutByFloor["<floor>"]` replaces any key of the shared `layout`. **4F** uses `layoutByFloor["4F"]` for the Boss suite; floors **1F–3F** use the shared `layout`.

## 4F Boss’s Suite

4F is the Boss’s floor, set up with `layoutByFloor["4F"]`. It has no corridor, lobby, department rooms or break area (those keys are `null` or empty). Instead it has:

- `suite`: one open marble-floored room with navy-and-gold wallpaper and a red carpet from the private lift.
- `terrace`: a rooftop deck over the east wing, with a `pool` rectangle.
- `rugs`: gold-bordered burgundy rugs.
- `props`: a list of `{type, x, y}` furniture in plan coordinates. The types are `fireplace`, `aquarium` (both animated), `big-painting`, `trophies`, `shelf`, `globe`, `lux-sofa`, `lux-sofa-l`, `lux-sofa-r`, `lux-coffee`, `bar`, `wine`, `stool`, `piano`, `pool-table`, `chandelier`, `palm`, `lounger`, `parasol`, `hot-tub` and `telescope`. Move or add furniture by editing this list.

The Boss seat (`4F|exec|boss`) uses the `exec` desk style: a mahogany executive desk with twin monitors and a velvet throne chair. When the Boss is not working, they relax on the lounge sofas (`restSlots`). On the elevation, 4F is drawn as a glass penthouse storey whose window lights up when the Boss is working. The Boss seat has no bot binding, so the bridge never writes a record for it; with live status on, the Boss is shown as not working unless you edit a status file yourself.

## Design your own Boss selfie

The Boss is drawn from a small pixel file instead of a generated shape. The project ships a generic crowned Boss bot in `data/boss.json`. To make the Boss look like you:

1. Copy `data/boss.json` to `data/boss.local.json`. The page loads `boss.local.json` first and falls back to `boss.json`. `boss.local.json` is git-ignored, so your selfie stays on your machine unless you choose to commit it.
2. Edit the file:

```json
{
  "name": "Boss",
  "outline": "#1e140e",
  "palette": { "H": "#2a1c16", "S": "#fde9da", "E": "#2b1a14", "J": "#6d93d6" },
  "pixels": [
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHSSSSSSSSSSHH.",
    ".SSSSESSSSESSSS.",
    ".SSSSESSSSESSSS.",
    "..SSSSSSSSSSSS..",
    "..JJJJJJJJJJJJ.."
  ]
}
```

- `pixels`: one string per row, one character per pixel, top to bottom. At most 24×24; 16 wide by 16–18 tall matches the other bots. `.` (or any character not in the palette) is transparent.
- `palette`: maps each character to a CSS color. Use any letters you like.
- `outline` (optional): a color for an automatic 1px outline around the whole sprite. Leave it out to draw your own outline in `pixels`.
- `name` (optional, up to 24 characters): the name on the desk plate and tooltip. It does not change the seat key, so status keeps working.

Each pixel is shown at 2×, and the sprite is centered over the throne with its bottom on the desk. Tips: draw the face in the top two-thirds, keep the eyes at least 3 pixels apart, and paint clothes on the bottom 3–4 rows like the other bots. Reload the page to see your changes.

## Avatar slots

Optional appearance fields can be set on seats or status records. Nonempty status values override seat values (`appearance()`); an image takes priority over the generated head.

- `avatarUrl` (string or null): optional image, masked by the selected shape.
- `avatarShape`: `wedge` (rounded right-pointing triangle), `teardrop`, `hex`, `blob` (circle), `cloud` (multi-lobed), `round` (circle), or `square`. Default: `blob`.
- `avatarColor`: CSS fill color; defaults to the department color.

Without an image, the bot is its shape alone: a 16×16 pixel sprite with two pale capsule eyes and clothes painted directly onto its lower rows (no separate body or legs). Office bots wear a shirt in a darker shade of their department color with a white collar and red tie; construction workers wear an orange safety vest with a reflective stripe and a hard hat. Current seat appearances:

| Role | Floor | Shape | Color |
| --- | --- | --- | --- |
| Office Head | 3F | wedge | `#10B8A0` |
| Optics Head | 3F | cloud | `#F86810` |
| Painting Head | 3F | teardrop | `#F09010` |
| Office PM | 2F | teardrop | `#10B8A0` |
| Optics PM | 2F | blob | `#F09010` |
| Painting PM | 2F | blob | `#F82838` |
| Ins Sampler | 1F | hex | `#A06838` |

`assets/avatar-demo.png` remains an unused image-slot example; the mock records contain no appearance overrides.

## Pixel-art interior

All art is original and procedural. `js/sprites.js` draws every floor tile, wallpaper, prop and avatar head pixel by pixel on tiny canvases, then exposes them as CSS custom properties (`--t-*` tiles, `--s-*` sprites) shown at 2x with `image-rendering: pixelated`. No external artwork, copied pixels or PNG files are used. The only external asset is the free Google Font "Pixelify Sans"; without network the page falls back to a monospace font. Visual density is inspired by [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT); this project is **not** a fork and does not copy that project’s pixels.

The look is a cozy farm-sim office: wood-plank, stone, checker and cobblestone floors, wallpapered back walls with wainscoting (tinted per department), windows with flower boxes, framed paintings, bookshelves, potted plants, rugs in the department color, a reception counter, a break-area sofa, coffee table, clock and water cooler, all on a grass lot. Every room, the lobby and the break area open onto the corridor through a door, and the lobby has a glass front entrance. Desks show a lit monitor when the seat is working and a dark one when it is Open. People sit behind their desk; the chair slides out when its owner is away. Avatar heads are the seat’s `avatarShape` rasterized to a 16x16 pixel sprite in `avatarColor`. The elevation is a small timber building whose windows light up for each working seat (dark = away, boarded = Open).

## Local status bridge (optional)

`tools/status-bridge/` (Python 3 stdlib only) runs **on your own machine**. It signs in with its own browser session, asks an **unpublished** backend for your bots and their status, maps them to occupied seats via optional hidden seat bindings in `data/org.json` (an implementation detail; never displayed on the page), and writes only `{records:[{seatKey, working, source:"live", updatedAt}]}` to `data/status.live.json` (gitignored). This is not an official API and may change at any time. Not for a public page.

```sh
# From the pixel-office folder.
# 1. One-time sign-in: opens your browser and waits until you finish signing in.
python3 tools/status-bridge/login.py
# 2. Run the bridge (start-office.command does this for you):
python3 tools/status-bridge/bridge.py                 # poll every 15 s (--interval N)
python3 tools/status-bridge/bridge.py --once          # single poll; non-zero exit on failure
python3 tools/status-bridge/bridge.py --from-fixture --once   # offline demo from fixture.json (no network)
# 3. Offline tests (no network, no sign-in):
python3 tools/status-bridge/test_bridge.py
```

- **Sign-in:** an independent session. The bridge never reads the desktop app's login, keychain entries, or config folders. Tokens are kept only in `tools/status-bridge/session.json` (mode `0600`, gitignored); the static page never reads them. Delete that file to sign out. Never commit it.
- **Mapping:** awaiting you → not working (break area); running → working (desk); idle with background work (subagents or working tasks) → working (desk); idle → not working. Unmapped agents, vacant seats, and seats without a binding get no record.
- **Failure:** if you are not signed in or a query fails, the bridge removes `data/status.live.json` so the page uses mock data, and prints the reason. It keeps polling, so signing in later starts live status without a restart.

The fixture uses synthetic ids, so against the real `data/org.json` it writes zero records; the tests use a synthetic org. Delete `data/status.live.json` to return to mock data. Flow notes: [docs/connect-status-notes.md](docs/connect-status-notes.md). Research: [docs/official-bot-api-research.md](docs/official-bot-api-research.md).
