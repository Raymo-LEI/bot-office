// Original pixel-art sprite engine: every tile and prop is drawn here on tiny canvases
// at 1px = 1 art pixel, then shown at 2x with image-rendering:pixelated. No external artwork.
(function (global) {
  const PAL = {
    k: '#2b1a10', // outline
    d: '#6e3b1f', w: '#a35a2a', W: '#cf8a45', h: '#eab26a', // wood ramp
    e: '#f4ecd8', p: '#f7e6b5', P: '#d8c39a',
    s: '#3f4a57', S: '#7c8a99', l: '#c3ccd3',
    b: '#1d2f45', B: '#3f7fb5', c: '#8fd6ea',
    g: '#2f6b34', G: '#4f9a3c', L: '#86c95a',
    t: '#9c4a2c', T: '#d0734a', r: '#b8343b', R: '#e0604f',
    y: '#f4c542', o: '#e0862f', u: '#6a4a9a',
    z: 'rgba(40,20,8,0.28)'
  };
  const col = c => PAL[c] || c;

  // ---- color helpers -------------------------------------------------------
  const probe = document.createElement('canvas').getContext('2d');
  function hex(c) {
    probe.fillStyle = '#000'; probe.fillStyle = c; const v = probe.fillStyle;
    if (v[0] !== '#') { const m = v.match(/\d+/g) || [0, 0, 0]; return m.slice(0, 3).map(Number); }
    const n = parseInt(v.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (c, t) => mix(c, '#1c0f08', t);
  const tint = (c, t) => mix(c, '#fff4dc', t);

  // ---- drawing core --------------------------------------------------------
  function paint(w, h, fn) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const r = (x, y, ww, hh, c) => { ctx.fillStyle = col(c); ctx.fillRect(x, y, ww, hh); };
    const p = (x, y, c) => r(x, y, 1, 1, c);
    fn(r, p, ctx, w, h);
    return cv.toDataURL();
  }
  // Adds a 1px outline around every opaque pixel (needs a 1px empty margin).
  function outline(ctx, w, h, c) {
    const d = ctx.getImageData(0, 0, w, h).data;
    const a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 200;
    ctx.fillStyle = col(c);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) ctx.fillRect(x, y, 1, 1);
  }

  // ---- floor tiles ---------------------------------------------------------
  const planks = base => paint(32, 15, (r, p) => {
    const hi = tint(base, .22), lo = shade(base, .14), seam = shade(base, .48);
    r(0, 0, 32, 15, base);
    [7, 23, 15].forEach((sx, j) => {
      const y = j * 5;
      r(0, y, 32, 1, hi); r(0, y + 4, 32, 1, seam);
      r(sx, y, 1, 4, seam); p(sx + 1, y, tint(base, .4));
      r((sx + 5) % 32, y + 2, 4, 1, lo); r((sx + 17) % 32, y + 1, 3, 1, lo); p((sx + 12) % 32, y + 3, lo);
    });
  });
  const stone = (base, grout) => paint(16, 16, r => {
    r(0, 0, 16, 16, grout);
    [[0, 0, 0], [8, 0, 1], [0, 8, 1], [8, 8, 0]].forEach(([x, y, alt]) => {
      const b = alt ? shade(base, .05) : base;
      r(x, y, 7, 7, b); r(x, y, 7, 1, tint(b, .35)); r(x, y, 1, 7, tint(b, .2));
      r(x, y + 6, 7, 1, shade(b, .15)); r(x + 6, y + 1, 1, 6, shade(b, .1));
    });
  });
  const checker = (a, b) => paint(16, 16, r => {
    [[0, 0, a], [8, 0, b], [0, 8, b], [8, 8, a]].forEach(([x, y, c]) => {
      r(x, y, 8, 8, c); r(x, y, 8, 1, tint(c, .3)); r(x, y + 7, 8, 1, shade(c, .18)); r(x + 7, y, 1, 8, shade(c, .1));
    });
  });
  const cobble = () => paint(16, 16, (r, p) => {
    const grout = '#6f5e4b', base = '#a99a83';
    r(0, 0, 16, 16, grout);
    const st = (x, y, w, h, b = base) => {
      r(x, y, w, h, b); r(x, y, w, 1, tint(b, .3)); r(x, y + h - 1, w, 1, shade(b, .2));
      [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].forEach(([a, c]) => p(a, c, grout));
    };
    st(0, 0, 6, 4); st(7, 0, 8, 4, '#b3a48c'); st(0, 5, 3, 4, '#9f907a'); st(4, 5, 7, 4); st(12, 5, 4, 4, '#9f907a');
    st(0, 10, 8, 5, '#b3a48c'); st(9, 10, 6, 5);
  });
  const stairs = () => paint(16, 8, r => {
    r(0, 0, 16, 8, '#8a7a66'); r(0, 0, 16, 2, '#c4b496'); r(0, 2, 16, 1, '#a8987d'); r(0, 6, 16, 2, '#4e4236');
  });
  const grass = () => paint(16, 16, (r, p) => {
    r(0, 0, 16, 16, '#5e9b3c');
    [[2, 3], [11, 1], [7, 9], [13, 12], [3, 13]].forEach(([x, y]) => { p(x, y, '#83c252'); p(x + 1, y - 1, '#83c252'); p(x + 2, y, '#83c252'); });
    [[6, 2], [14, 6], [1, 8], [9, 14], [10, 6]].forEach(([x, y]) => p(x, y, '#487f2e'));
    p(5, 6, '#f2e27a'); p(12, 10, '#f6f0e0');
  });
  const wallpaper = color => paint(16, 22, (r, p) => {
    const base = tint(color, .6), str = tint(color, .42);
    r(0, 0, 16, 15, base); r(0, 0, 2, 15, str); r(8, 0, 1, 15, str);
    [[12, 4], [4, 10]].forEach(([x, y]) => { p(x, y - 1, str); p(x - 1, y, str); p(x + 1, y, str); p(x, y + 1, str); p(x, y, tint(color, .8)); });
    r(0, 15, 16, 1, 'h'); r(0, 16, 16, 1, 'W');
    r(0, 17, 16, 4, 'w'); r(0, 17, 16, 1, 'W'); r(7, 18, 1, 3, 'd'); r(15, 18, 1, 3, 'd');
    r(0, 21, 16, 1, 'd');
  });

  // ---- props ---------------------------------------------------------------
  const desk = on => paint(44, 30, (r, p) => {
    r(1, 28, 43, 2, 'z');
    // monitor
    r(1, 0, 14, 10, 'k'); r(2, 1, 12, 8, 's'); r(3, 2, 10, 6, on ? 'B' : 'b');
    if (on) { r(3, 2, 10, 1, 'c'); r(4, 4, 5, 1, 'c'); r(4, 5, 3, 1, 'L'); r(8, 5, 3, 1, 'y'); r(4, 6, 6, 1, 'c'); p(12, 7, 'L'); }
    else { p(4, 3, 's'); p(5, 3, 's'); p(4, 4, 's'); }
    r(7, 10, 2, 1, 'k'); r(5, 11, 6, 1, 'k');
    // top surface
    r(0, 12, 44, 7, 'k'); r(1, 13, 42, 5, 'W'); r(1, 13, 42, 1, 'h'); r(1, 17, 42, 1, 'w');
    r(17, 14, 12, 3, 'k'); r(18, 14, 10, 2, 'l'); for (let i = 0; i < 5; i++) p(18 + i * 2, 15, 'S');
    r(3, 14, 8, 3, 'p'); r(4, 15, 5, 1, 'P'); p(10, 14, 'e');
    // mug
    r(34, 9, 5, 5, 'k'); r(35, 10, 3, 3, 'r'); p(35, 10, 'R'); r(39, 10, 1, 2, 'k');
    if (on) { p(36, 7, 'e'); p(37, 6, 'e'); p(36, 5, 'e'); }
    // front panel + drawers
    r(0, 19, 44, 9, 'k'); r(1, 19, 42, 8, 'w'); r(1, 19, 42, 1, 'd');
    r(4, 21, 10, 5, 'd'); r(5, 22, 8, 3, 'w');
    r(29, 20, 13, 6, 'W'); r(29, 20, 13, 1, 'h'); r(29, 23, 13, 1, 'd');
    r(34, 21, 3, 1, 'k'); r(34, 25, 3, 1, 'k');
  });
  const chair = c => paint(14, 16, r => {
    r(1, 0, 12, 11, 'k'); r(2, 1, 10, 9, c); r(2, 1, 10, 1, tint(c, .35)); r(2, 9, 10, 1, shade(c, .3)); r(6, 4, 2, 2, shade(c, .25));
    r(0, 10, 14, 5, 'k'); r(1, 11, 12, 3, shade(c, .1)); r(1, 11, 12, 1, tint(c, .25));
    r(1, 15, 2, 1, 'k'); r(11, 15, 2, 1, 'k');
  });
  const windowS = () => paint(24, 18, (r, p) => {
    r(0, 0, 24, 18, 'k'); r(1, 1, 22, 15, 'W'); r(1, 1, 22, 1, 'h');
    [3, 13].forEach(x => { r(x, 3, 8, 11, '#9fdcf0'); r(x, 3, 8, 3, '#c8eefa'); r(x, 11, 8, 3, '#7cc6e2'); p(x + 1, 4, 'e'); p(x + 2, 4, 'e'); p(x + 1, 5, 'e'); });
    r(11, 3, 2, 11, 'W'); r(3, 8, 18, 1, 'W');
    r(0, 15, 24, 2, 'h'); r(0, 17, 24, 1, 'd');
    // flower box
    r(5, 13, 14, 2, 't'); p(7, 12, 'R'); p(10, 12, 'y'); p(13, 12, 'R'); p(16, 12, 'e'); p(8, 12, 'G'); p(14, 12, 'G');
  });
  const painting = () => paint(16, 13, (r, p) => {
    r(0, 0, 16, 13, 'k'); r(1, 1, 14, 11, '#c8962e'); r(1, 1, 14, 1, 'y');
    r(2, 2, 12, 9, '#9fdcf0'); r(10, 3, 2, 2, 'y'); p(9, 4, '#fbe7a0');
    r(2, 7, 12, 4, 'G'); r(3, 6, 5, 1, 'G'); r(4, 5, 2, 1, 'G'); r(9, 7, 5, 1, 'L'); r(2, 9, 12, 2, 'g'); p(6, 8, 'L');
  });
  const clock = () => paint(12, 12, (r, p, ctx, w, h) => {
    r(3, 1, 6, 10, 'W'); r(1, 3, 10, 6, 'W'); r(2, 2, 8, 8, 'W');
    r(3, 2, 6, 8, 'e'); r(2, 3, 8, 6, 'e');
    r(5, 3, 1, 3, 'k'); r(6, 5, 2, 1, 'k'); p(9, 4, 'P');
    outline(ctx, w, h, 'k');
  });
  const bookshelf = () => paint(24, 28, (r, p) => {
    r(0, 0, 24, 28, 'k'); r(1, 1, 22, 26, 'w'); r(1, 1, 22, 1, 'h'); r(2, 2, 20, 23, 'd');
    const books = [[2, 5, 'r'], [2, 6, 'B'], [1, 4, 'y'], [3, 6, 'G'], [2, 5, 'u'], [2, 6, 'T'], [3, 4, 'P'], [2, 6, 'c'], [2, 5, 'o']];
    [8, 16, 24].forEach((y, s) => {
      let x = 2, i = s * 3;
      while (x < 21) { const [bw, bh, c] = books[i++ % books.length], ww = Math.min(bw, 22 - x); r(x, y - bh, ww, bh, c); r(x, y - bh, ww, 1, tint(col(c), .35)); x += ww; if (s === 1 && x > 14 && x < 18) { r(x, y - 3, 3, 3, 'G'); r(x, y - 4, 1, 1, 'L'); x += 4; } }
      r(1, y, 22, 2, 'W'); r(1, y, 22, 1, 'h');
    });
    r(1, 26, 22, 1, 'w');
  });
  const plant = () => paint(14, 22, (r, p, ctx, w, h) => {
    r(6, 1, 2, 3, 'G'); r(3, 3, 3, 2, 'G'); r(8, 3, 3, 2, 'G'); r(2, 5, 4, 3, 'G'); r(8, 5, 4, 3, 'G'); r(4, 6, 6, 5, 'G');
    r(5, 9, 4, 3, 'g'); r(2, 7, 2, 1, 'g'); r(10, 7, 2, 1, 'g');
    p(6, 2, 'L'); p(4, 4, 'L'); p(9, 4, 'L'); p(3, 6, 'L'); p(10, 6, 'L'); p(6, 7, 'L');
    r(3, 13, 8, 2, 'T'); r(3, 13, 8, 1, '#ec9b6f'); r(4, 15, 6, 5, 't'); r(4, 15, 1, 5, 'T');
    outline(ctx, w, h, 'k');
    r(4, 21, 7, 1, 'z');
  });
  const counter = () => paint(52, 26, (r, p) => {
    r(6, 0, 11, 9, 'k'); r(7, 1, 9, 6, 'S'); r(7, 1, 9, 1, 'l'); r(10, 7, 3, 3, 'k');
    r(39, 7, 5, 2, 'y'); p(41, 6, 'y'); p(40, 7, '#fff0a0'); r(38, 9, 7, 1, 'k');
    r(25, 8, 8, 2, 'G'); r(25, 8, 8, 1, 'L'); r(26, 7, 6, 1, 'p');
    r(0, 10, 52, 5, 'k'); r(1, 11, 50, 3, 'h'); r(1, 13, 50, 1, 'W');
    r(0, 15, 52, 10, 'k'); r(1, 15, 50, 9, 'w'); r(1, 15, 50, 1, 'd');
    [1, 13, 26, 39].forEach(x => { r(x + 1, 17, 10, 6, 'd'); r(x + 2, 18, 8, 4, 'W'); r(x + 2, 18, 8, 1, 'h'); });
    r(1, 25, 51, 1, 'z');
  });
  const sofa = c => paint(14, 46, r => {
    r(0, 0, 14, 46, 'k');
    r(1, 1, 12, 5, tint(c, .2)); r(1, 1, 12, 1, tint(c, .45)); r(1, 40, 12, 5, tint(c, .2)); r(1, 40, 12, 1, tint(c, .45));
    r(1, 6, 4, 34, shade(c, .22));
    [[6, 11], [18, 10], [29, 11]].forEach(([y, hh]) => { r(5, y, 8, hh, c); r(5, y, 8, 1, tint(c, .35)); r(12, y, 1, hh, shade(c, .15)); });
    r(5, 17, 8, 1, shade(c, .45)); r(5, 28, 8, 1, shade(c, .45));
  });
  const coffeeTable = () => paint(16, 12, (r, p) => {
    r(0, 0, 16, 9, 'k'); r(1, 1, 14, 7, 'W'); r(1, 1, 14, 1, 'h'); r(1, 7, 14, 1, 'w');
    r(2, 2, 4, 4, 'k'); r(3, 3, 2, 2, 'e'); r(8, 3, 6, 3, 'B'); r(8, 3, 6, 1, 'c');
    r(1, 9, 2, 2, 'k'); r(13, 9, 2, 2, 'k'); r(3, 11, 10, 1, 'z');
  });
  const cooler = () => paint(12, 24, (r, p, ctx, w, h) => {
    r(3, 1, 6, 8, '#9fdcf0'); r(3, 1, 6, 2, '#c8eefa'); r(4, 9, 4, 1, 'S');
    r(2, 10, 8, 12, 'l'); r(2, 10, 8, 1, 'e'); r(2, 21, 8, 1, 'S');
    p(4, 13, 'r'); p(7, 13, 'B'); r(3, 16, 6, 1, 'S'); r(3, 18, 6, 1, 'S');
    outline(ctx, w, h, 'k');
  });
  const door = () => paint(14, 20, r => {
    r(0, 0, 14, 20, 'k'); r(1, 1, 12, 19, 'w'); r(2, 2, 10, 7, 'W'); r(2, 11, 10, 8, 'W'); r(2, 2, 10, 1, 'h'); r(2, 11, 10, 1, 'h'); r(10, 10, 2, 2, 'y');
  });

  const entrance = () => paint(26, 8, r => {
    r(0, 0, 26, 8, 'k'); r(1, 1, 11, 6, '#9fdcf0'); r(14, 1, 11, 6, '#9fdcf0'); r(1, 1, 11, 2, '#c8eefa'); r(14, 1, 11, 2, '#c8eefa');
    r(12, 0, 2, 8, 'S'); r(10, 3, 1, 2, 'y'); r(15, 3, 1, 2, 'y');
  });

  // ---- construction wing ------------------------------------------------------
  const concrete = () => paint(16, 16, (r, p) => {
    r(0, 0, 16, 16, '#aaa596');
    [[2, 3], [9, 1], [13, 7], [5, 11], [11, 13], [1, 14], [7, 6]].forEach(([x, y]) => p(x, y, '#8f8a7c'));
    [[4, 1], [12, 4], [8, 9], [2, 8], [14, 12]].forEach(([x, y]) => p(x, y, '#c2bdae'));
    p(9, 10, '#7d786b'); p(10, 11, '#7d786b'); p(10, 12, '#7d786b'); p(11, 12, '#7d786b');
  });
  const studs = () => paint(16, 22, r => {
    r(0, 0, 16, 22, '#e7a3a6'); r(0, 4, 16, 1, '#d48a8f'); r(0, 11, 16, 1, '#d48a8f'); r(0, 17, 16, 1, '#d48a8f');
    r(3, 7, 2, 1, '#f3c2c3'); r(11, 14, 2, 1, '#f3c2c3');
    r(7, 0, 3, 22, 'W'); r(7, 0, 1, 22, 'h'); r(9, 0, 1, 22, 'w');
    r(0, 0, 16, 2, 'W'); r(0, 0, 16, 1, 'h'); r(0, 19, 16, 3, 'w'); r(0, 19, 16, 1, 'W'); r(0, 21, 16, 1, 'd');
  });
  const scaffold = () => paint(32, 44, r => {
    [1, 28].forEach(x => { r(x, 0, 3, 44, 'k'); r(x + 1, 0, 1, 44, 'l'); });
    [3, 23].forEach(y => { r(1, y, 30, 2, 's'); r(1, y, 30, 1, 'S'); });
    for (let i = 0; i < 18; i++) { r(4 + i * 1.33 | 0, 5 + i, 2, 1, 's'); r(4 + i * 1.33 | 0, 25 + i, 2, 1, 's'); }
    [[0, 19], [0, 39]].forEach(([x, y]) => { r(x, y, 32, 4, 'k'); r(x + 1, y + 1, 30, 2, 'W'); r(x + 1, y + 1, 30, 1, 'h'); r(10, y + 1, 1, 2, 'd'); r(21, y + 1, 1, 2, 'd'); });
  });
  const lumber = () => paint(30, 14, (r, p, ctx, w, h) => {
    [[1, 9], [3, 5], [2, 1]].forEach(([x, y]) => { r(x, y, 26, 4, 'W'); r(x, y, 26, 1, 'h'); r(x, y + 3, 26, 1, 'w'); r(x, y, 2, 4, 'P'); p(x, y + 1, 'w'); });
    outline(ctx, w, h, 'k');
  });
  const bricks = () => paint(22, 16, (r, p, ctx, w, h) => {
    r(1, 12, 20, 3, 'w'); r(1, 12, 20, 1, 'W'); r(4, 14, 2, 1, 'd'); r(16, 14, 2, 1, 'd');
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
      const x = 1 + i * 5 + (row % 2 ? 2 : 0), y = 9 - row * 4; if (x + 4 > 21) continue;
      r(x, y, 4, 3, 'r'); r(x, y, 4, 1, 'R');
    }
    outline(ctx, w, h, 'k');
  });
  const cone = () => paint(12, 14, (r, p, ctx, w, h) => {
    r(5, 1, 2, 2, 'o'); r(4, 3, 4, 3, 'e'); r(4, 6, 4, 2, 'o'); r(3, 8, 6, 2, 'e'); r(3, 10, 6, 1, 'o'); p(5, 4, '#ffffff');
    r(1, 11, 10, 2, '#c95f1a');
    outline(ctx, w, h, 'k');
  });
  const barricade = () => paint(32, 16, (r, p, ctx, w, h) => {
    for (let x = 1; x < 31; x++) r(x, 2, 1, 4, ((x >> 2) % 2) ? 'e' : 'o');
    r(1, 2, 30, 1, '#ffd08a');
    r(4, 6, 2, 8, 'S'); r(26, 6, 2, 8, 'S'); r(2, 13, 6, 1, 's'); r(24, 13, 6, 1, 's');
    r(14, 0, 4, 2, 'y');
    outline(ctx, w, h, 'k');
  });
  const cement = () => paint(20, 12, (r, p, ctx, w, h) => {
    r(1, 5, 18, 6, 'P'); r(1, 5, 18, 1, 'p'); r(3, 1, 14, 5, 'p'); r(3, 1, 14, 1, 'e'); r(6, 3, 8, 1, 'S'); r(5, 8, 10, 1, 'S');
    outline(ctx, w, h, 'k');
  });
  const wheelbarrow = () => paint(26, 16, (r, p, ctx, w, h) => {
    r(3, 3, 16, 6, 'G'); r(3, 3, 16, 1, 'L'); r(5, 2, 12, 2, 'P'); r(6, 1, 8, 1, 'p');
    r(19, 5, 6, 1, 'S'); r(21, 7, 4, 1, 'S');
    r(2, 10, 5, 5, 's'); r(3, 11, 3, 3, 'S'); r(14, 9, 2, 5, 'S');
    outline(ctx, w, h, 'k');
  });
  const ladder = () => paint(12, 36, (r, p, ctx, w, h) => {
    r(1, 1, 2, 34, 'W'); r(9, 1, 2, 34, 'W'); r(1, 1, 1, 34, 'h'); r(9, 1, 1, 34, 'h');
    for (let y = 4; y < 34; y += 5) r(3, y, 6, 1, 'w');
    outline(ctx, w, h, 'k');
  });
  const hardhat = () => paint(18, 9, (r, p, ctx, w, h) => {
    r(4, 1, 10, 2, 'y'); r(3, 2, 12, 4, 'y'); r(1, 6, 16, 2, '#d9a520'); r(5, 2, 3, 1, '#fff0a0'); r(8, 1, 2, 5, '#e8b52a');
    outline(ctx, w, h, 'k');
  });
  const hammer = () => paint(10, 12, (r, p, ctx, w, h) => {
    r(1, 1, 8, 3, 'S'); r(1, 1, 8, 1, 'l'); r(4, 4, 2, 7, 'W'); r(4, 4, 1, 7, 'h');
    outline(ctx, w, h, 'k');
  });
  const blueprint = () => paint(18, 12, (r, p, ctx, w, h) => {
    r(1, 1, 16, 10, '#2f6fb0'); r(1, 1, 16, 1, '#5f9bd8');
    r(3, 3, 6, 5, '#c8e4ff'); r(4, 4, 4, 3, '#2f6fb0'); r(11, 3, 4, 1, '#c8e4ff'); r(11, 5, 3, 1, '#c8e4ff'); r(11, 7, 4, 1, '#c8e4ff');
    outline(ctx, w, h, 'k');
  });

  // ---- 4F penthouse ---------------------------------------------------------------
  const GOLD = '#d4a93a', GOLD_HI = '#f2d16b', GOLD_DK = '#9c7424';
  const MAH = '#8a3a26', MAH_DK = '#6a2818', MAH_DKR = '#4a180e';
  const VEL = '#a8323e', VEL_DK = '#7e1f2b', VEL_DKR = '#561420';
  const marble = () => paint(16, 16, (r, p) => {
    r(0, 0, 16, 16, '#efe9df'); r(0, 0, 15, 1, '#f8f4ec');
    [[1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 6], [7, 7], [9, 9], [10, 10], [11, 10], [12, 11], [3, 11], [4, 12]].forEach(([x, y]) => p(x, y, '#d6cdbd'));
    p(8, 8, '#c9bfae'); p(13, 12, '#c9bfae');
    r(0, 15, 16, 1, GOLD); r(15, 0, 1, 16, GOLD);
  });
  const luxWall = () => paint(16, 22, (r, p) => {
    r(0, 0, 16, 15, '#1f3550');
    for (let d = 0; d <= 3; d++) [[8 - d, 7 - (3 - d)], [8 + d, 7 - (3 - d)], [8 - d, 7 + (3 - d)], [8 + d, 7 + (3 - d)]].forEach(([x, y]) => p(x, y, '#b8923a'));
    p(8, 7, GOLD_HI); p(0, 0, '#b8923a'); p(0, 14, '#b8923a'); p(0, 7, '#2d4a6a');
    r(0, 15, 16, 1, GOLD_HI); r(0, 16, 16, 1, GOLD_DK);
    r(0, 17, 16, 4, MAH_DK); r(0, 17, 16, 1, MAH); r(2, 18, 12, 2, MAH_DKR); r(0, 21, 16, 1, '#3a120a');
  });
  const water = () => paint(16, 16, (r, p) => {
    r(0, 0, 16, 16, '#3fa0d8');
    [[1, 2], [2, 2], [9, 5], [10, 5], [11, 4], [4, 10], [5, 10], [13, 12], [14, 12]].forEach(([x, y]) => p(x, y, '#8ed8f4'));
    [[6, 1], [12, 8], [2, 13], [8, 14]].forEach(([x, y]) => p(x, y, '#2f86c4'));
  });
  const execDesk = () => paint(64, 30, (r, p) => {
    r(1, 28, 63, 2, 'z');
    [2, 12].forEach(x => { r(x, 0, 10, 9, 'k'); r(x + 1, 1, 8, 7, 's'); r(x + 2, 2, 6, 5, 'B'); r(x + 2, 2, 6, 1, 'c'); r(x + 3, 4, 3, 1, 'L'); r(x + 3, 5, 4, 1, 'y'); r(x + 4, 9, 2, 3, 'k'); });
    r(52, 1, 9, 5, 'k'); r(53, 2, 7, 3, GOLD_HI); r(53, 4, 7, 1, GOLD); r(56, 6, 1, 5, GOLD_DK); r(54, 10, 5, 2, GOLD_DK);
    r(0, 12, 64, 8, 'k'); r(1, 13, 62, 6, MAH); r(1, 13, 62, 1, '#b5573c'); r(1, 18, 62, 1, MAH_DK);
    r(24, 14, 16, 4, '#2f4a3a'); [[24, 14], [39, 14], [24, 17], [39, 17]].forEach(([x, y]) => p(x, y, GOLD));
    r(26, 15, 12, 2, 'l'); r(42, 15, 5, 1, GOLD_HI); r(47, 13, 4, 4, 'k'); r(48, 14, 2, 2, 'e'); r(4, 14, 7, 3, 'p'); r(5, 15, 5, 1, 'P');
    r(0, 20, 64, 9, 'k'); r(1, 20, 62, 8, MAH_DK); r(1, 20, 62, 1, GOLD);
    [3, 47].forEach(x => { r(x, 22, 14, 5, MAH_DKR); r(x + 1, 23, 12, 3, '#7a3020'); p(x + 7, 24, GOLD); });
    r(24, 22, 16, 4, GOLD_DK); r(25, 23, 14, 2, GOLD_HI); [27, 29, 31, 33, 35].forEach(x => p(x, 23, GOLD_DK));
    r(1, 28, 4, 1, GOLD); r(59, 28, 4, 1, GOLD);
  });
  const throne = () => paint(18, 18, (r, p) => {
    r(1, 0, 16, 13, 'k'); r(2, 1, 14, 11, VEL_DK); r(2, 1, 14, 1, VEL); r(6, 0, 6, 1, GOLD);
    [5, 9, 13].forEach(x => [3, 7].forEach(y => p(x, y, GOLD_HI)));
    r(0, 12, 18, 5, 'k'); r(1, 13, 16, 3, VEL); r(1, 13, 16, 1, '#c8505a'); r(0, 12, 2, 5, GOLD); r(16, 12, 2, 5, GOLD);
    r(1, 17, 2, 1, 'k'); r(15, 17, 2, 1, 'k');
  });
  const fireplace = () => paint(80, 26, r => {
    const H = [[3, 6, 9, 7, 11, 8, 10, 6, 8, 5, 9, 7, 10, 6, 8, 4, 6, 3], [5, 8, 6, 10, 7, 11, 7, 9, 6, 10, 6, 9, 7, 9, 5, 7, 4, 5]];
    [0, 1].forEach(f => {
      const ox = f * 40;
      r(ox, 0, 40, 26, 'k'); r(ox + 1, 1, 38, 24, '#d9d0c2'); r(ox + 1, 1, 38, 2, '#efe9df'); r(ox + 1, 3, 38, 1, GOLD);
      r(ox + 2, 5, 3, 19, '#c9bfae'); r(ox + 35, 5, 3, 19, '#c9bfae');
      r(ox + 8, 8, 24, 17, '#2a1a14'); r(ox + 9, 9, 22, 15, '#1a0e0a');
      H[f].forEach((hh, i) => {
        const x = ox + 11 + i;
        r(x, 21 - hh, 1, hh, '#e0602f'); if (hh > 3) r(x, 23 - hh, 1, hh - 2, '#f4a23a'); if (hh > 6) r(x, 25 - hh, 1, hh - 5, '#ffe27a');
      });
      r(ox + 11, 21, 18, 2, '#6a3a1f'); r(ox + 13, 21, 4, 1, '#8a5a2a'); r(ox + 22, 22, 5, 1, '#8a5a2a');
      r(ox + 15, 0, 10, 1, GOLD_HI);
    });
  });
  const aquarium = () => paint(112, 24, (r, p) => {
    [0, 1].forEach(f => {
      const ox = f * 56;
      r(ox, 0, 56, 24, 'k'); r(ox + 1, 1, 54, 17, '#2f7fb5'); r(ox + 1, 1, 54, 3, '#5fb0e0'); r(ox + 1, 15, 54, 3, '#e8d49a');
      r(ox + 6, 8, 2, 7, 'G'); r(ox + 8, 10, 2, 5, 'g'); r(ox + 44, 6, 2, 9, 'G'); r(ox + 47, 9, 2, 6, 'L'); r(ox + 24, 13, 6, 2, 'S'); r(ox + 25, 12, 3, 1, 'l');
      [[12 + f * 3, 6, 'o', 1], [32 - f * 3, 9, 'y', -1], [38 + f * 2, 4, 'R', 1], [18 - f * 2, 11, GOLD_HI, -1]].forEach(([x, y, c, d]) => {
        r(ox + x, y, 3, 2, c); p(ox + x + (d > 0 ? -1 : 3), y, c); p(ox + x + (d > 0 ? 2 : 0), y, 'k');
      });
      p(ox + 21, 3 + f * 3, 'e'); p(ox + 22, 8 - f * 3, 'e'); p(ox + 41, 5 + f * 2, 'e');
      r(ox + 1, 18, 54, 5, MAH_DKR); r(ox + 1, 18, 54, 1, GOLD); r(ox + 26, 20, 4, 1, GOLD);
    });
  });
  const bar = () => paint(60, 26, (r, p) => {
    [[6, 'c'], [14, '#7e1f2b'], [40, '#c8862e'], [50, 'c']].forEach(([x, c]) => { r(x, 0, 3, 4, 'k'); r(x + 1, 1, 1, 3, c); });
    r(24, 1, 3, 3, '#2f6b34'); r(25, 0, 1, 1, '#2f6b34'); r(31, 2, 4, 2, GOLD_HI);
    r(0, 4, 60, 6, 'k'); r(1, 5, 58, 4, '#efe9df'); r(1, 8, 58, 1, '#d6cdbd');
    r(0, 10, 60, 15, 'k'); r(1, 10, 58, 14, MAH_DK); r(1, 12, 58, 1, GOLD);
    [3, 17, 31, 45].forEach(x => { r(x, 14, 12, 8, VEL_DK); p(x + 3, 17, GOLD_HI); p(x + 8, 17, GOLD_HI); r(x, 14, 12, 1, VEL); });
    r(1, 23, 58, 1, GOLD); r(1, 25, 59, 1, 'z');
  });
  const wineShelf = () => paint(60, 18, r => {
    r(0, 0, 60, 18, 'k'); r(1, 1, 58, 16, MAH_DKR);
    const cols = ['#2f6b34', '#7e1f2b', '#c8862e', '#cfe8f0', '#2f6b34', '#7e1f2b'];
    [8, 16].forEach((y, s) => { for (let i = 0, x = 3; x < 56; i++, x += 4) { const c = cols[(i + s * 2) % cols.length]; r(x, y - 5, 2, 5, c); r(x, y - 6, 1, 1, c); } r(1, y, 58, 1, GOLD); });
  });
  const stool = () => paint(10, 12, (r, p, ctx, w, h) => {
    r(2, 1, 6, 4, VEL); r(1, 2, 8, 2, VEL); r(3, 1, 3, 1, '#c8505a'); r(4, 5, 2, 4, GOLD); r(2, 9, 6, 1, GOLD_DK);
    outline(ctx, w, h, 'k');
  });
  const piano = () => paint(40, 34, (r, p, ctx, w, h) => {
    r(1, 1, 36, 22, '#1c1c24'); ctx.clearRect(30, 1, 7, 5); ctx.clearRect(33, 6, 4, 6); ctx.clearRect(35, 12, 2, 5);
    r(5, 4, 22, 14, '#2a2a36'); r(5, 4, 22, 1, GOLD); for (let x = 7; x < 26; x += 3) r(x, 5, 1, 12, '#6a6a7a');
    r(3, 2, 20, 1, '#4a4a5a');
    r(1, 23, 30, 4, 'e'); for (let x = 2; x < 30; x += 4) { r(x, 23, 1, 2, '#1c1c24'); r(x + 2, 23, 1, 2, '#1c1c24'); }
    r(9, 29, 14, 4, '#1c1c24'); r(10, 30, 12, 2, VEL_DK);
    outline(ctx, w, h, 'k');
  });
  const luxSofaCanvas = () => {
    const cv = document.createElement('canvas'); cv.width = 44; cv.height = 18; const c = cv.getContext('2d');
    const r = (x, y, w, h, col_) => { c.fillStyle = col(col_); c.fillRect(x, y, w, h); };
    r(0, 0, 44, 18, 'k'); r(1, 1, 42, 6, VEL_DK); [8, 15, 22, 29, 36].forEach(x => r(x, 3, 1, 1, GOLD_HI));
    r(1, 1, 5, 15, VEL); r(38, 1, 5, 15, VEL); r(1, 1, 42, 1, '#c8505a');
    r(6, 7, 16, 8, VEL); r(22, 7, 16, 8, VEL); r(22, 7, 1, 8, VEL_DKR); r(6, 7, 32, 1, '#c8505a'); r(6, 14, 32, 1, VEL_DK);
    r(1, 16, 2, 2, GOLD); r(41, 16, 2, 2, GOLD);
    return cv;
  };
  const rotated = (src, dir) => {
    const cv = document.createElement('canvas'); cv.width = src.height; cv.height = src.width; const c = cv.getContext('2d');
    c.translate(cv.width / 2, cv.height / 2); c.rotate(dir * Math.PI / 2); c.drawImage(src, -src.width / 2, -src.height / 2);
    return cv.toDataURL();
  };
  const luxCoffee = () => paint(26, 14, (r, p) => {
    r(0, 0, 26, 10, 'k'); r(1, 1, 24, 8, GOLD); r(2, 2, 22, 6, '#bfe6f2'); r(3, 3, 6, 1, 'e');
    r(11, 3, 4, 4, '#2f6fb0'); p(12, 2, 'R'); p(13, 1, 'y'); p(14, 2, 'R'); p(11, 1, 'R'); p(13, 2, 'G');
    r(1, 10, 2, 3, GOLD_DK); r(23, 10, 2, 3, GOLD_DK); r(3, 13, 20, 1, 'z');
  });
  const palm = () => paint(20, 32, (r, p, ctx, w, h) => {
    r(3, 3, 6, 2, 'G'); r(11, 3, 6, 2, 'G'); r(1, 5, 4, 2, 'G'); r(15, 5, 4, 2, 'G'); r(5, 1, 3, 2, 'L'); r(12, 1, 3, 2, 'L');
    r(2, 7, 3, 2, 'g'); r(15, 7, 3, 2, 'g'); r(7, 5, 6, 4, 'G'); r(8, 6, 2, 1, 'L');
    r(9, 9, 2, 10, '#8a5a2a'); [11, 14, 17].forEach(y => r(9, y, 2, 1, '#6a3a1f'));
    r(5, 19, 10, 2, GOLD_HI); r(6, 21, 8, 8, GOLD); r(6, 21, 2, 8, GOLD_HI); r(12, 21, 2, 8, GOLD_DK);
    outline(ctx, w, h, 'k'); r(6, 31, 9, 1, 'z');
  });
  const chandelier = () => paint(26, 20, (r, p, ctx, w, h) => {
    r(11, 8, 4, 4, GOLD); r(12, 9, 2, 2, GOLD_HI);
    [[3, 9], [21, 9], [6, 3], [18, 3], [6, 15], [18, 15]].forEach(([x, y]) => {
      const mx = (x + 12) >> 1, my = (y + 9) >> 1; r(mx, my, 2, 1, GOLD_DK); r(x, y, 3, 2, GOLD); p(x + 1, y - 1, '#ffe27a');
    });
    [[9, 5], [16, 5], [9, 14], [16, 14], [5, 9], [19, 12]].forEach(([x, y]) => p(x, y, '#c8eefa'));
    outline(ctx, w, h, 'k');
  });
  const trophyCase = () => paint(28, 30, r => {
    r(0, 0, 28, 30, 'k'); r(1, 1, 26, 28, MAH_DK); r(2, 2, 24, 25, '#3a5a70'); r(3, 3, 1, 22, '#5a7a90');
    [10, 19, 27].forEach((y, s) => {
      r(2, y, 24, 1, GOLD);
      [5, 12, 19].forEach((x, i) => { if ((i + s) % 3 === 2 && s) { r(x, y - 3, 3, 3, GOLD_HI); r(x + 1, y - 4, 1, 1, VEL); return; }
        r(x, y - 6, 4, 3, GOLD_HI); r(x + 1, y - 3, 2, 2, GOLD); r(x, y - 1, 4, 1, GOLD_DK); });
    });
  });
  const bigPainting = () => paint(32, 22, (r, p) => {
    r(0, 0, 32, 22, 'k'); r(1, 1, 30, 20, GOLD); r(1, 1, 30, 1, GOLD_HI); r(1, 20, 30, 1, GOLD_DK);
    r(3, 3, 26, 16, '#f4a26a'); r(3, 3, 26, 5, '#e0705a'); r(18, 7, 4, 3, '#ffe27a'); r(17, 8, 6, 1, '#ffe27a');
    r(3, 9, 9, 3, '#6a4a6a'); r(5, 8, 4, 1, '#6a4a6a'); r(3, 12, 26, 7, '#2f6fb0'); r(17, 13, 6, 1, '#ffe27a'); r(19, 15, 3, 1, '#f4c542'); r(6, 16, 5, 1, '#5f9bd8');
  });
  const globe = () => paint(14, 20, (r, p, ctx, w, h) => {
    r(4, 1, 6, 10, '#2f6fb0'); r(2, 3, 10, 6, '#2f6fb0'); r(3, 2, 8, 8, '#2f6fb0');
    r(4, 3, 3, 3, 'G'); r(8, 6, 3, 2, 'G'); r(5, 8, 2, 1, 'G'); p(4, 2, '#8fd6ea');
    r(1, 5, 1, 4, GOLD); r(12, 4, 1, 4, GOLD); r(6, 11, 2, 5, GOLD_DK); r(3, 16, 8, 2, GOLD);
    outline(ctx, w, h, 'k');
  });
  const poolTable = () => paint(60, 36, (r, p) => {
    r(0, 0, 60, 34, 'k'); r(1, 1, 58, 32, MAH); r(1, 1, 58, 1, '#b5573c'); r(5, 5, 50, 24, '#2f7a4a'); r(5, 5, 50, 1, '#256a3e');
    [[3, 3], [28, 2], [53, 3], [3, 27], [28, 28], [53, 27]].forEach(([x, y]) => r(x, y, 4, 4, '#111'));
    [[38, 15, 'y'], [41, 13, 'R'], [41, 17, 'B'], [44, 11, 'u'], [44, 15, 'k'], [44, 19, 'o'], [16, 16, 'e']].forEach(([x, y, c]) => { r(x, y, 2, 2, c); p(x, y, '#ffffffaa'); });
    for (let i = 0; i < 20; i++) p(2 + i, 25 - (i >> 1), i < 4 ? 'k' : '#e0b070');
    r(2, 34, 4, 2, 'k'); r(54, 34, 4, 2, 'k'); [12, 24, 36, 48].forEach(x => p(x, 1, GOLD_HI));
  });
  const lounger = () => paint(12, 26, (r, p, ctx, w, h) => {
    r(1, 1, 10, 24, '#e8e0d0'); for (let y = 2; y < 24; y += 4) r(2, y, 8, 2, '#3f7fb5'); r(2, 1, 8, 6, '#cfc6b4');
    r(3, 14, 6, 6, '#f4ecd8'); r(3, 14, 6, 1, '#e0604f');
    outline(ctx, w, h, 'k');
  });
  const parasol = () => paint(32, 32, (r, p, ctx, w, h) => {
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
      const dx = i + .5 - 16, dy = j + .5 - 16, d = Math.hypot(dx, dy); if (d > 14.5) continue;
      const sec = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 4)) % 2;
      p(i, j, sec ? (d > 12 ? '#c84a3e' : '#e0604f') : (d > 12 ? '#e0d8c4' : '#f4ecd8'));
    }
    r(15, 15, 2, 2, GOLD); outline(ctx, w, h, 'k');
  });
  const hotTub = () => paint(40, 40, (r, p, ctx, w, h) => {
    for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) {
      const d = Math.hypot(i + .5 - 20, j + .5 - 20);
      if (d <= 18.5) p(i, j, d > 15 ? (j < 20 ? '#efe9df' : '#d6cdbd') : (d > 14 ? '#2f86c4' : '#5fc0e0'));
    }
    [[14, 12], [22, 15], [18, 22], [26, 24], [12, 20], [24, 10], [16, 28]].forEach(([x, y]) => { p(x, y, 'e'); p(x + 1, y + 1, '#c8eefa'); });
    outline(ctx, w, h, 'k');
  });
  const telescope = () => paint(16, 20, (r, p, ctx, w, h) => {
    for (let i = 0; i < 9; i++) { r(3 + i, 9 - i, 3, 2, GOLD); } r(12, 0, 3, 3, GOLD_HI); r(3, 9, 3, 2, GOLD_DK);
    r(7, 10, 1, 8, '#6a3a1f'); r(4, 17, 2, 2, '#6a3a1f'); r(10, 17, 2, 2, '#6a3a1f'); r(7, 17, 1, 2, '#6a3a1f');
    outline(ctx, w, h, 'k');
  });

  // ---- avatar heads: the seat's shape rasterized onto a 16x16 pixel grid ----------
  const HN = 16, U = 34 / HN, EYE = '#FFF6E8';
  const EYES = {
    blob: [[8, 6, 1, 3], [10, 6, 1, 3]], round: [[8, 6, 1, 3], [10, 6, 1, 3]], square: [[8, 6, 1, 3], [10, 6, 1, 3]],
    cloud: [[8, 6, 1, 3], [10, 6, 1, 3]], teardrop: [[8, 7, 1, 3], [10, 7, 1, 3]], hex: [[6, 6, 1, 3], [8, 6, 1, 3]],
    wedge: [[6, 7, 2, 1], [9, 7, 2, 1]]
  };
  function shapeTest(shape, ctx) {
    ctx.setTransform(1, 0, 0, 1, 1, 1);
    const P = d => new Path2D(d);
    const circ = (cx, cy, rr) => { const q = new Path2D(); q.arc(cx, cy, rr, 0, Math.PI * 2); return q; };
    if (shape === 'wedge') {
      const q = P('M7 7L25 16L7 25Z'); ctx.lineWidth = 7; ctx.lineJoin = 'round';
      return (x, y) => ctx.isPointInPath(q, x, y) || ctx.isPointInStroke(q, x, y);
    }
    if (shape === 'teardrop') {
      ctx.translate(16, 17); ctx.rotate(-40 * Math.PI / 180); ctx.translate(-16, -17);
      const q = P('M16 3C16 3 5.5 15 5.5 21a10.5 10.5 0 1 0 21 0C26.5 15 16 3 16 3Z');
      return (x, y) => ctx.isPointInPath(q, x, y);
    }
    if (shape === 'hex') { const q = P('M16 2.4L27.8 9.2L27.8 22.8L16 29.6L4.2 22.8L4.2 9.2Z'); return (x, y) => ctx.isPointInPath(q, x, y); }
    if (shape === 'square') { const q = P('M3 3H29V29H3Z'); return (x, y) => ctx.isPointInPath(q, x, y); }
    if (shape === 'cloud') {
      const cs = [[10, 19, 8], [19.2, 20, 7.4], [15, 13, 8.6], [7.4, 14.2, 6], [23.2, 14.6, 6.1]].map(a => circ(...a));
      return (x, y) => cs.some(q => ctx.isPointInPath(q, x, y));
    }
    const q = circ(16, 16, 14); return (x, y) => ctx.isPointInPath(q, x, y);
  }
  const headCache = new Map();
  // outfit: {kind:'shirt', color, tie} or {kind:'vest'} — clothes are painted onto the lower rows of the shape.
  const CLOTH_TOP = 10;
  function head(shape, color, outfit) {
    const key = shape + '|' + color + '|' + JSON.stringify(outfit || null);
    if (headCache.has(key)) return headCache.get(key);
    const tc = document.createElement('canvas').getContext('2d');
    const inside = shapeTest(shape, tc);
    const m = [];
    for (let j = 0; j < HN; j++) { m[j] = []; for (let i = 0; i < HN; i++) m[j][i] = inside((i + .5) * U, (j + .5) * U); }
    const at = (i, j) => j >= 0 && i >= 0 && j < HN && i < HN && m[j][i];
    const fill = toHex(hex(color)), dark = shade(fill, .3), hi = tint(fill, .4), line = shade(fill, .65);
    const cloth = outfit ? (outfit.kind === 'vest' ? '#e0862f' : toHex(hex(outfit.color || '#4a6f8a'))) : null;
    const url = paint(HN, HN, (r, p) => {
      for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) {
        const rim = !at(i, j + 1) || !at(i, j + 2) && !at(i + 1, j + 1);
        if (at(i, j) && cloth && j >= CLOTH_TOP) p(i, j, rim ? shade(cloth, .3) : (!at(i - 1, j) ? tint(cloth, .2) : cloth));
        else if (at(i, j)) p(i, j, rim ? dark : (!at(i, j - 1) && i < 9) ? hi : fill);
        else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) p(i, j, line);
      }
      (EYES[shape] || EYES.blob).forEach(([x, y, w, h]) => r(x, y, w, h, EYE));
      if (!cloth) return;
      const row = []; for (let i = 0; i < HN; i++) if (at(i, CLOTH_TOP)) row.push(i);
      if (!row.length) return;
      const cx = Math.round((row[0] + row[row.length - 1] + 1) / 2); // seam between cx-1 and cx
      const put = (i, j, c) => { if (at(i, j)) p(i, j, c); };
      if (outfit.kind === 'vest') {
        for (let j = CLOTH_TOP; j < HN; j++) { put(cx - 1, j, '#c3ccd3'); put(cx, j, '#9aa6b0'); }
        for (let i = 0; i < HN; i++) if (i < cx - 1 || i > cx) put(i, CLOTH_TOP + 1, '#f4e04a');
      } else {
        const tie = outfit.tie || '#b8343b';
        [cx - 2, cx + 1].forEach(i => put(i, CLOTH_TOP, '#f4ecd8'));
        put(cx - 1, CLOTH_TOP, tie); put(cx, CLOTH_TOP, tie);
        for (let j = CLOTH_TOP + 1; j < HN; j++) { put(cx - 1, j, tie); if (j < CLOTH_TOP + 3) put(cx, j, shade(tie, .2)); }
      }
    });
    headCache.set(key, url); return url;
  }

  // ---- cached per-color tiles ------------------------------------------------
  const wallCache = new Map();
  const wall = c => { if (!wallCache.has(c)) wallCache.set(c, wallpaper(c)); return wallCache.get(c); };

  // Publish static art as CSS custom properties so style.css can use var(--s-*) / var(--t-*).
  const art = {
    't-wood': planks('#c98a4b'), 't-wood-red': planks('#b26c3c'), 't-wood-pale': planks('#dcae72'),
    't-stone': stone('#dccba5', '#a8916a'), 't-checker': checker('#efe0bf', '#c9774e'), 't-cobble': cobble(),
    't-stairs': stairs(), 't-grass': grass(), 't-wall-rest': wallpaper('#6fae8a'), 't-wall-lobby': wallpaper('#c9774e'),
    's-desk': desk(true), 's-desk-off': desk(false), 's-chair': chair('#4f7a63'), 's-window': windowS(),
    's-painting': painting(), 's-clock': clock(), 's-shelf': bookshelf(), 's-plant': plant(), 's-counter': counter(),
    's-sofa': sofa('#4f8a6e'), 's-coffee': coffeeTable(), 's-cooler': cooler(), 's-door': door(), 's-entrance': entrance(),
    't-concrete': concrete(), 't-studs': studs(), 's-scaffold': scaffold(), 's-lumber': lumber(), 's-bricks': bricks(),
    's-cone': cone(), 's-barricade': barricade(), 's-cement': cement(), 's-wheelbarrow': wheelbarrow(), 's-ladder': ladder(),
    's-hardhat': hardhat(), 's-hammer': hammer(), 's-blueprint': blueprint(),
    't-marble': marble(), 't-lux-wall': luxWall(), 't-water': water(), 't-deck': planks('#b07a48'),
    's-exec-desk': execDesk(), 's-throne': throne(), 's-fireplace': fireplace(), 's-aquarium': aquarium(), 's-bar': bar(),
    's-wine': wineShelf(), 's-stool': stool(), 's-piano': piano(), 's-lux-coffee': luxCoffee(), 's-palm': palm(),
    's-chandelier': chandelier(), 's-trophies': trophyCase(), 's-big-painting': bigPainting(), 's-globe': globe(),
    's-pool-table': poolTable(), 's-lounger': lounger(), 's-parasol': parasol(), 's-hot-tub': hotTub(), 's-telescope': telescope()
  };
  const sofaCv = luxSofaCanvas();
  art['s-lux-sofa'] = sofaCv.toDataURL(); art['s-lux-sofa-l'] = rotated(sofaCv, -1); art['s-lux-sofa-r'] = rotated(sofaCv, 1);
  // Pixel-file portraits (data/boss.json): {palette:{char:color}, pixels:[rows], outline?:color}. Max 24x24.
  const pixelCache = new Map();
  function pixelArt(def) {
    if (!def || !Array.isArray(def.pixels) || !def.pixels.length || !def.palette) return null;
    const key = JSON.stringify([def.pixels, def.palette, def.outline]);
    if (pixelCache.has(key)) return pixelCache.get(key);
    const rowsIn = def.pixels.slice(0, 24).map(r => [...String(r)].slice(0, 24));
    const pad = def.outline ? 1 : 0, w = Math.max(...rowsIn.map(r => r.length)) + pad * 2, h = rowsIn.length + pad * 2;
    const url = paint(w, h, (r, p, ctx) => {
      rowsIn.forEach((row, j) => row.forEach((ch, i) => { const c = def.palette[ch]; if (c && ch !== '.') p(i + pad, j + pad, c); }));
      if (def.outline) outline(ctx, w, h, def.outline);
    });
    const out = { url, w, h }; pixelCache.set(key, out); return out;
  }
  const css = Object.entries(art).map(([k, v]) => `--${k}:url(${v});`).join('');
  const st = document.createElement('style'); st.textContent = `:root{${css}}`; document.head.appendChild(st);

  global.Sprites = { head, wall, tint, shade, pixelArt };
})(window);
