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
  function head(shape, color) {
    const key = shape + '|' + color;
    if (headCache.has(key)) return headCache.get(key);
    const tc = document.createElement('canvas').getContext('2d');
    const inside = shapeTest(shape, tc);
    const m = [];
    for (let j = 0; j < HN; j++) { m[j] = []; for (let i = 0; i < HN; i++) m[j][i] = inside((i + .5) * U, (j + .5) * U); }
    const at = (i, j) => j >= 0 && i >= 0 && j < HN && i < HN && m[j][i];
    const fill = toHex(hex(color)), dark = shade(fill, .3), hi = tint(fill, .4), line = shade(fill, .65);
    const url = paint(HN, HN, (r, p) => {
      for (let j = 0; j < HN; j++) for (let i = 0; i < HN; i++) {
        if (at(i, j)) p(i, j, !at(i, j + 1) || !at(i, j + 2) && !at(i + 1, j + 1) ? dark : (!at(i, j - 1) && i < 9) ? hi : fill);
        else if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) p(i, j, line);
      }
      (EYES[shape] || EYES.blob).forEach(([x, y, w, h]) => r(x, y, w, h, EYE));
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
    's-sofa': sofa('#4f8a6e'), 's-coffee': coffeeTable(), 's-cooler': cooler(), 's-door': door()
  };
  const css = Object.entries(art).map(([k, v]) => `--${k}:url(${v});`).join('');
  const st = document.createElement('style'); st.textContent = `:root{${css}}`; document.head.appendChild(st);

  global.Sprites = { head, wall, tint, shade };
})(window);
