// org.json drives the layout; binary status positions people at desks or in the break area.
let org, cur, statusMap = new Map(), boss = null;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function columns() {
  const cols = org.departments.map(d => ({dept: d}));
  cols.splice(0, 0, {core: true});
  if ((org.layout.construction || []).length) cols.push({wip: true});
  return cols;
}
const R = (b, cls, style='', inner='') => `<div class="${cls}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;${style}">${inner}</div>`;

function working(seat) {
  return window.StatusAPI ? StatusAPI.isWorking(seat, statusMap) : false;
}

// Status appearance overrides seat appearance; fallback is the seat shape rasterized as a pixel head.
const SHAPES = new Set(['wedge', 'teardrop', 'hex', 'blob', 'cloud', 'round', 'square']);

function appearance(seat) {
  const rec = (window.StatusAPI && statusMap.get(StatusAPI.seatKey(seat))) || {};
  const pick = k => (rec[k] != null && rec[k] !== '') ? rec[k] : ((seat[k] != null && seat[k] !== '') ? seat[k] : null);
  const shape = pick('avatarShape');
  return {
    url: pick('avatarUrl'),
    sprite: pick('avatarSprite'),
    shape: SHAPES.has(shape) ? shape : 'blob',
    color: pick('avatarColor')
  };
}
const cssUrl = u => String(u).replace(/["'()\\\s]/g, encodeURIComponent);
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function personHTML(seat, color, x, y, where, z) {
  const a = appearance(seat);
  const fill = a.color || color;
  const shape = a.shape;
  const art = a.sprite === 'boss' && Sprites.pixelArt(boss);
  const head = art ? `<i class="p-head portrait" style="background-image:url(${art.url});width:${art.w * 2}px;height:${art.h * 2}px;left:${20 - art.w}px;top:${34 - art.h * 2}px"></i>` : a.url
    ? `<i class="p-head has-img shape-${esc(shape)}" style="background-image:url('${esc(cssUrl(a.url))}');background-color:${esc(fill)}"></i>`
    : `<i class="p-head" style="background-image:url(${Sprites.head(shape, fill, {kind: 'shirt', color: Sprites.shade(color, .3)})})"></i>`;
  const delay = -(hash(seat.title) % 1000) / 1000;
  return `<div class="person at-${where}" style="left:${x}px;top:${y}px;${z ? `z-index:${z};` : ''}--c:${esc(fill)};--cd:${esc(Sprites.shade(fill, .35))};animation-delay:${delay}s" title="${esc(seat.title)} · ${where === 'desk' ? 'working' : 'not working'}">` +
    head +
    `<em>${esc(seat.title)}</em></div>`;
}

// Decorative, inaccessible wing: worker bots are scenery, never seats.
const WORKERS = [
  {fx: .2, fy: .23, shape: 'square', color: '#8fa3b3', act: 'hammer'},
  {fx: .62, fy: .14, shape: 'hex', color: '#c7a27a', act: 'carry'},
  {fx: .55, fy: .55, shape: 'blob', color: '#7fb0c8', act: 'hammer'},
  {fx: .16, fy: .78, shape: 'cloud', color: '#b49ad0', act: 'carry'}
];
function wipHTML(c) {
  const iw = c.w - 12, ih = c.h - 12, at = (fx, fy) => `left:${Math.round(fx * iw)}px;top:${Math.round(fy * ih)}px`;
  const props = [
    ['scaffold', .06, .08], ['ladder', .3, .1], ['blueprint', .4, .28], ['lumber', .64, .26], ['bricks', .07, .45],
    ['cement', .72, .42], ['cement', .78, .46], ['cone', .38, .44], ['cone', .46, .47], ['wheelbarrow', .63, .7],
    ['scaffold', .7, .8], ['lumber', .36, .86], ['bricks', .5, .9], ['cone', .1, .66]
  ].map(([k, fx, fy]) => `<i class="spr ${k}" style="${at(fx, fy)}"></i>`).join('');
  const workers = WORKERS.map((w, i) => `<div class="person worker ${w.act}" style="${at(w.fx, w.fy)};animation-delay:${-i * .37}s">` +
    `<i class="p-head" style="background-image:url(${Sprites.head(w.shape, w.color, {kind: 'vest'})})"></i><i class="spr hat"></i>` +
    `<i class="spr ${w.act === 'hammer' ? 'hammer' : 'lumber carried'}"></i></div>`).join('');
  return `<i class="wall wall-wip"></i><span class="lbl wip-sign">${esc(c.label || 'New wing')}<small>${esc(c.note || 'Under construction')} · No entry</small></span>` + props + workers;
}

// 4F penthouse: one open suite plus a rooftop terrace; furniture comes from layout.props.
function suiteHTML(L) {
  let h = '';
  if (L.suite) h += R(L.suite, 'p-suite', '', `<i class="wall wall-lux"></i><span class="lbl lux-sign">${esc(L.suite.label || 'Suite')}</span><i class="suite-door"></i><i class="suite-door terrace-door"></i><i class="red-carpet"></i>`);
  if (L.terrace) { const t = L.terrace, pl = t.pool;
    h += R(t, 'p-terrace', '', `<span class="lbl lux-sign">${esc(t.label || 'Terrace')}</span>`);
    if (pl) h += R(pl, 'pool');
  }
  (L.rugs || []).forEach(r => { h += R(r, 'lux-rug'); });
  (L.props || []).forEach(p => { h += `<div class="spr lux lux-${esc(p.type)}" style="left:${p.x}px;top:${p.y}px"></div>`; });
  return h;
}

function floorLayout() { return Object.assign({}, org.layout, (org.layoutByFloor && org.layoutByFloor[cur]) || {}); }
function planHTML(groups) {
  const L = floorLayout(), dm = Object.fromEntries(org.departments.map(d => [d.id, d]));
  const wallFor = c => `<i class="wall" style="background-image:url(${Sprites.wall(c)})"></i>`;
  let h = '';
  if (L.corridor) h += R(L.corridor, 'p-corr', '', `<i class="runner"></i><span class="plaque">${esc(L.corridor.label||'')}</span>` +
      ((L.construction||[]).length ? '<i class="spr barricade"></i><i class="spr cone corr-cone1"></i><i class="spr cone corr-cone2"></i>' : ''));
  h += R(L.core, 'p-core', '', `<span class="plaque">${esc(L.core.label).replace('/', '/<wbr>')}</span>`);
  if (L.lobby) h += R(L.lobby, 'p-lobby', '', `<i class="wall wall-lobby"></i><span class="lbl">${esc(L.lobby.label)}</span><i class="spr wdoor"></i><i class="spr painting lobby-art"></i><i class="spr counter"></i><i class="spr plant lobby-plant"></i><i class="spr plant lobby-plant2"></i><i class="entry-mat"></i><i class="spr entrance"></i>`);
  if (L.rest) h += R(L.rest, 'p-rest', '', `<i class="wall wall-rest"></i><span class="lbl">${esc(L.rest.label||'Break area')}</span><i class="spr wdoor"></i><i class="spr clock"></i><i class="rug rest-rug"></i><i class="spr sofa"></i><i class="spr coffee"></i><i class="spr cooler"></i>`);
  (L.rooms||[]).forEach(r => { const d = dm[r.department];
    const top = r.y === 0;
    h += R(r, 'p-room' + (d ? ` dept-${esc(d.id)}` : ' p-misc') + (top ? ' door-s' : ' door-n'), d ? `--dept-color:${d.color}` : '',
      `${wallFor(d ? d.color : '#b8a88f')}<i class="rug"></i><span class="lbl">${esc(r.label)}</span><i class="spr window"></i><i class="spr painting"></i><i class="spr shelf"></i><i class="spr plant"></i>${top ? '<i class="door"></i>' : '<i class="spr wdoor"></i>'}`); });

  (L.construction || []).forEach(c => { h += R(c, 'p-wip', '', wipHTML(c)); });
  h += suiteHTML(L);

  const used = {};
  let restIdx = 0;
  const restSlots = L.restSlots || [];

  org.seats.filter(s => s.floor === cur).forEach(s => {
    const slots = L.deskSlots.filter(k => k.department === s.department);
    const si = used[s.department] = (used[s.department] || 0);
    used[s.department]++;
    const k = slots[si];
    if (!k) return;
    const d = dm[s.department] || {color:'#d4a93a'};
    // desk always drawn; chair sits behind the person, desk front in front of them
    const away = !s.vacant && !working(s);
    const ex = k.style === 'exec';
    h += `<div class="chair-spr${ex ? ' throne' : ''}${away ? ' pushed' : ''}${s.vacant ? ' empty' : ''}" style="left:${k.x + (ex ? 46 : 34)}px;top:${k.y + (ex ? -2 : 6)}px"></div>`;
    h += `<div class="desk${ex ? ' exec' : ''} f${k.facing||'S'} ${s.vacant?'vacant':''}${away?' away':''}" style="left:${k.x}px;top:${k.y}px">` +
      `<b class="desk-spr"></b>` +
      `<em>${esc(s.title)}${away?'<i class="away-tag">(Away)</i>':''}${s.groupId?`<small>${esc((groups[s.groupId]||{}).name||s.groupId)}</small>`:''}</em></div>`;
    // vacant: empty desk, no person
    if (s.vacant) return;
    if (working(s)) {
      h += personHTML(s, d.color, k.x + (ex ? 44 : 28), k.y + 5, 'desk');
    } else {
      const rs = restSlots[restIdx++];
      if (rs) h += personHTML(s, d.color, rs.x, rs.y, 'rest', 20 - restIdx);
    }
  });
  return h;
}

function seatsOf(f, d) { return org.seats.filter(s => s.floor === f && s.department === d); }

function render() {
  const groups = Object.fromEntries((org.groups || []).map(g => [g.id, g]));
  $('#switch').innerHTML = org.floors.map(f => `<button data-f="${f.id}" class="${f.id===cur?'on':''}">${f.id} ${esc(f.label)}</button>`).join('');
  const isPent = f => !!((org.layoutByFloor || {})[f.id] || {}).suite;
  const pentBay = f => `<div class="core">${esc(org.layout.core.label)}</div><div class="bay pent">${org.seats.filter(s => s.floor === f.id).map(s =>
    `<i class="win ${working(s) ? 'lit' : 'dark'}" title="${esc(s.title)}"></i>`).join('')}<i class="pent-palm"></i><i class="pent-palm p2"></i></div>`;
  $('#building').innerHTML = org.floors.map(f => `<div class="storey${isPent(f) ? ' penthouse' : ''} ${f.id===cur?'on':''}" data-f="${f.id}"><span class="tag">${f.id}</span>` +
    (isPent(f) ? pentBay(f) : columns().map(c => c.core ? `<div class="core">${esc(org.layout.core.label)}</div>` : c.wip ? '<div class="bay wip" title="Under construction"></div>' :
      `<div class="bay" style="--dept-color:${c.dept.color}">${seatsOf(f.id, c.dept.id).map(s =>
        `<i class="win ${s.vacant ? 'vacant' : working(s) ? 'lit' : 'dark'}" title="${esc(s.title)}"></i>`).join('')}</div>`).join('')) + '</div>').join('') + '<div class="ground"></div>';
  const fl = org.floors.find(f => f.id === cur);
  $('#planTitle').textContent = `Plan · ${fl.id} ${fl.label}`;
  { const FL = floorLayout(); $("#plan").style.width = FL.width+"px"; $("#plan").style.height = FL.height+"px"; }
  $('#plan').innerHTML = planHTML(groups);
  $('#legend').innerHTML = org.departments.map(d => `<span style="background:${d.color}"></span>${esc(d.name)}`).join('') +
    ((org.groups||[]).length ? ' · Groups: ' + org.groups.map(g => esc(g.name)).join(', ') : '') +
    (floorLayout().suite ? ' · At desk = working · On the lounge sofas = not working' : ' · At desk = working · In break area = not working · Empty desk = Open') + ' · Lit window = working' +
    ((floorLayout().construction || []).length ? ' · <span class="wip-swatch"></span>Under construction (no access)' : '');
}

function go(f) { if (org.floors.some(x => x.id === f)) { cur = f; render(); } }
document.addEventListener('click', e => { const t = e.target.closest('[data-f]'); if (t) go(t.dataset.f); });
document.addEventListener('keydown', e => { if (/^[1-9]$/.test(e.key)) go(e.key + 'F'); });

// The Boss portrait: data/boss.local.json (your own, git-ignored) wins over the shared data/boss.json.
const getJSON = u => fetch(u, {cache: 'no-store'}).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
const loadBoss = () => getJSON('data/boss.local.json').catch(() => getJSON('data/boss.json')).catch(() => null);

Promise.all([
  fetch('data/org.json').then(r => r.json()),
  loadBoss(),
  (window.StatusAPI ? StatusAPI.loadStatus() : Promise.resolve(new Map())).catch(() => new Map())
]).then(([j, b, map]) => {
  org = j; boss = b; statusMap = map;
  if (boss && boss.name) org.seats.filter(s => s.avatarSprite === 'boss').forEach(s => { s.title = String(boss.name).slice(0, 24); }); cur = org.floors[0].id; render();
  if (window.StatusAPI) setInterval(() => StatusAPI.loadStatus().then(m => { statusMap = m; render(); }).catch(() => {}), StatusAPI.REFRESH_MS);
}).catch(e => document.body.insertAdjacentHTML('beforeend', `<p>Unable to load the office. Serve this folder with python3 -m http.server 8765 and open http://127.0.0.1:8765/ (not file://). ${esc(e)}</p>`));
