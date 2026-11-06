# Bot Office

A pure static HTML/CSS/JavaScript office: no frameworks or build step. There is no official browser-pollable status API; an optional local `grokbot` CLI bridge can write status for your own machine (see below).

## Run locally

```sh
cd /workspace/bot-office/pixel-office
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/ in a browser. HTTP is required for JSON fetches; `file://` will not work. Press 1 / 2 / 3 to switch floors, or click a floor.

## Organization and layout

`data/org.json` drives floors, departments, groups, seats, and geometry. The same 1100×640 layout is used on all three floors: a core, corridor, lobby, three department rooms, a break area, and an east wing that is still under construction. Seats are placed in department order at that department's `deskSlots`. People who are not working use `restSlots`; Open seats have no person.

To add an optional project group:
1. Add a group such as `{"id":"g-lens","name":"Lens group"}` to `groups`.
2. Set `"groupId":"g-lens"` on the relevant seat.

Departments use `{id, name, color}`. Their color is a rug and wall-trim accent, not a full-room wash. Geometry lives in `layout` (`core`, `corridor`, `lobby`, `rooms`, `deskSlots`, `rest`, `restSlots`, `construction`). Keep slots inside their rooms and allow space for character nameplates.

Capacity: each department room has 6 desk slots (3 columns × 2 rows, filled column by column so the first four seats form a 2×2 block), and the break area has 10 rest slots (2 columns × 5 rows). Adding a seat to `seats` is enough until a department passes six people.

`construction` is a list of `{x, y, w, h, label, note}` areas drawn as a fenced-off building site with hazard tape, scaffolding, materials and decorative worker bots in hard hats. Nobody can be seated there, and the corridor is barricaded where it meets the site. When a wing is ready, remove its `construction` entry and add a room plus `deskSlots` in its place.

## Binary status

- Schema: `data/status.schema.json`, shaped as `{"records":[{seatKey, working, source, updatedAt}]}`. `state: "working" | "away"` is also accepted.
- Seat key: `floor|department|id` when a seat has an optional `id` (used for the 1F Open desks, e.g. `1F|optics|optics-1`); otherwise `floor|department|title`.
- Per-floor layout (optional): `layoutByFloor["<floor>"]` overrides any key of the shared `layout`. No floor uses it right now.
- Mock data: `data/status.mock.json`. Open seats use their `id` in the key (`1F|optics|optics-1`…`optics-4`, `1F|painting|painting-2`…`painting-4`, `1F|office|office-1`…`office-4`); other seats use `floor|department|title`.
- Loader: `js/status.js` exposes `window.StatusAPI` (`STATUS_URL`, `loadStatus`, `seatKey`, `isWorking`).
- `working: true` places a person at their computer desk.
- `working: false`, an away state, or a missing/unknown record places a person in the break area.
- Open seats (`vacant: true`) retain a desk and empty chair but never show a person.
- An away person's desk has a grey `(Away)` badge and dimmed chair; their name follows them to the break area.

The page fetches `data/status.live.json` first and falls back to `data/status.mock.json` if it is missing or invalid; it re-fetches every 15 s. The page only reads that JSON and never reads desktop logins, config folders, tokens, or sessions.

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

All art is original and procedural. `js/sprites.js` draws every floor tile, wallpaper, prop and avatar head pixel by pixel on tiny canvases, then exposes them as CSS custom properties (`--t-*` tiles, `--s-*` sprites) shown at 2x with `image-rendering: pixelated`. No external artwork, copied pixels or PNG files are used. The only external asset is the free Google Font "Pixelify Sans"; without network the page falls back to a monospace font.

The look is a cozy farm-sim office: wood-plank, stone, checker and cobblestone floors, wallpapered back walls with wainscoting (tinted per department), windows with flower boxes, framed paintings, bookshelves, potted plants, rugs in the department color, a reception counter, a break-area sofa, coffee table, clock and water cooler, all on a grass lot. Every room, the lobby and the break area open onto the corridor through a door, and the lobby has a glass front entrance. Desks show a lit monitor when the seat is working and a dark one when it is Open. People sit behind their desk; the chair slides out when its owner is away. Avatar heads are the seat's `avatarShape` rasterized to a 16x16 pixel sprite in `avatarColor`. The elevation is a small timber building whose windows light up for each working seat (dark = away, boarded = Open).

1F keeps its twelve reserved desks (four per department); 3F and 2F have one desk per department, with room to grow. The seven occupied roles, avatar tokens, and mock working flags are unchanged.

## Local status bridge (optional)

`tools/status-bridge/bridge.py` (Python 3 stdlib only) runs **on your own machine with your own grokbot login**. It runs exactly `grokbot status --json`, maps agents to seats via the optional hidden `agentId` on `data/org.json` seats (never displayed), and writes only `{records:[{seatKey, working, source:"live", updatedAt}]}` to `data/status.live.json` (gitignored). Not for a public page. The CLI is undocumented and may change with the client.

Mapping (case-insensitive; `_`/`-` treated as spaces): `running`, `background work` → working (desk); `awaiting you`, `idle`, anything unknown → not working (break area). Computer/asleep fields are ignored. Unmapped agents are ignored. If the CLI is missing, fails, or returns unusable JSON, the bridge exits non-zero and leaves the live file untouched.

```sh
# 1. Log in to grokbot on your machine with the grokbot client (your own account).
# 2. From the pixel-office folder:
python3 tools/status-bridge/bridge.py                 # poll every 15 s (--interval N)
python3 tools/status-bridge/bridge.py --once          # single write
python3 tools/status-bridge/bridge.py --from-fixture --once   # prove mapping without the CLI
# 3. Serve the page:
python3 -m http.server 8765
```

Delete `data/status.live.json` to return to mock data. Research notes: `docs/official-bot-api-research.md`.
