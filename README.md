# Bot Office

Bot Office is a browser pixel-office visualizer for one building. Cut 0 (`cut0/`) is the isometric concept. Cut 1.1 (`pixel-office/`) is the interactive plan: 4F Boss's Suite, 3F Heads, 2F PMs, and 1F Workers, with Optics, Painting, and Office wings. Rooms, desks, and the rest area come from `pixel-office/data/org.json`.

A person is drawn in one of two places. `busy` or `working` puts them at their computer. Any other status, including an internal `unknown`, puts them in that floor's rest area. The page does not show a third status badge. Seats marked vacant stay empty.

## Run

From the repository root:

```bash
cd pixel-office && python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

Floor buttons or keys 1–4 switch the plan. The page needs HTTP so it can fetch JSON.

Layout rules, the mock status file, and how to point the page at a live status API later: [pixel-office/README.md](pixel-office/README.md).

## What is in the repo

- `cut0/` — concept SVG, preview, generator, and layout notes
- `pixel-office/` — static visualizer, org layout, rest area, status mock, and floor evidence
- `CONTRIBUTING.md` — branch and commit conventions
