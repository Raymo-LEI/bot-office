// org.json drives the layout; binary status positions people at desks or in the break area.
let org, cur, statusMap = new Map();
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function columns() {
  const cols = org.departments.map(d => ({dept: d}));
  cols.splice(0, 0, {core: true}); return cols;
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
  const head = a.url
    ? `<i class="p-head has-img shape-${esc(shape)}" style="background-image:url('${esc(cssUrl(a.url))}');background-color:${esc(fill)}"></i>`
    : `<i class="p-head" style="background-image:url(${Sprites.head(shape, fill)})"></i>`;
  const delay = -(hash(seat.title) % 1000) / 1000;
  return `<div class="person at-${where}" style="left:${x}px;top:${y}px;${z ? `z-index:${z};` : ''}--c:${esc(fill)};--cd:${esc(Sprites.shade(fill, .35))};animation-delay:${delay}s" title="${esc(seat.title)} · ${where === 'desk' ? 'working' : 'not working'}">` +
    head + `<i class="p-body"></i><i class="p-legs"></i>` +
    `<em>${esc(seat.title)}</em></div>`;
}

function floorLayout() { return Object.assign({}, org.layout, (org.layoutByFloor && org.layoutByFloor[cur]) || {}); }
function planHTML(groups) {
  const L = floorLayout(), dm = Object.fromEntries(org.departments.map(d => [d.id, d]));
  const wallFor = c => `<i class="wall" style="background-image:url(${Sprites.wall(c)})"></i>`;
  let h = R(L.corridor, 'p-corr', '', `<i class="runner"></i><span class="plaque">${esc(L.corridor.label||'')}</span>`) +
    R(L.core, 'p-core', '', `<span class="plaque">${esc(L.core.label).replace('/', '/<wbr>')}</span>`) +
    R(L.lobby, 'p-lobby', '', `<i class="wall wall-lobby"></i><span class="lbl">${esc(L.lobby.label)}</span><i class="spr painting lobby-art"></i><i class="spr counter"></i><i class="spr plant lobby-plant"></i><i class="entry-mat"></i>`);
  if (L.rest) h += R(L.rest, 'p-rest', '', `<i class="wall wall-rest"></i><span class="lbl">${esc(L.rest.label||'Break area')}</span><i class="spr clock"></i><i class="rug rest-rug"></i><i class="spr sofa"></i><i class="spr coffee"></i><i class="spr cooler"></i><i class="spr plant rest-plant"></i>`);
  (L.rooms||[]).forEach(r => { const d = dm[r.department];
    const top = r.y === 0;
    h += R(r, 'p-room' + (d ? ` dept-${esc(d.id)}` : ' p-misc') + (top ? ' door-s' : ' door-n'), d ? `--dept-color:${d.color}` : '',
      `${wallFor(d ? d.color : '#b8a88f')}<i class="rug"></i><span class="lbl">${esc(r.label)}</span><i class="spr window"></i><i class="spr painting"></i><i class="spr shelf"></i><i class="spr plant"></i>${top ? '<i class="door"></i>' : '<i class="spr wdoor"></i>'}`); });

  const used = {};
  let restIdx = 0;
  const restSlots = L.restSlots || [];

  org.seats.filter(s => s.floor === cur).forEach(s => {
    const slots = L.deskSlots.filter(k => k.department === s.department);
    const si = used[s.department] = (used[s.department] || 0);
    used[s.department]++;
    const k = slots[si];
    if (!k) return;
    const d = dm[s.department] || {color:'#999'};
    // desk always drawn; chair sits behind the person, desk front in front of them
    const away = !s.vacant && !working(s);
    h += `<div class="chair-spr${away ? ' pushed' : ''}${s.vacant ? ' empty' : ''}" style="left:${k.x + 34}px;top:${k.y + 6}px"></div>`;
    h += `<div class="desk f${k.facing||'S'} ${s.vacant?'vacant':''}${away?' away':''}" style="left:${k.x}px;top:${k.y}px">` +
      `<b class="desk-spr"></b>` +
      `<em>${esc(s.title)}${away?'<i class="away-tag">(Away)</i>':''}${s.groupId?`<small>${esc((groups[s.groupId]||{}).name||s.groupId)}</small>`:''}</em></div>`;
    // vacant: empty desk, no person
    if (s.vacant) return;
    if (working(s)) {
      h += personHTML(s, d.color, k.x + 28, k.y - 2, 'desk');
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
  $('#building').innerHTML = org.floors.map(f => `<div class="storey ${f.id===cur?'on':''}" data-f="${f.id}"><span class="tag">${f.id}</span>` +
    columns().map(c => c.core ? `<div class="core">${esc(org.layout.core.label)}</div>` :
      `<div class="bay" style="--dept-color:${c.dept.color}">${seatsOf(f.id, c.dept.id).map(s =>
        `<i class="win ${s.vacant ? 'vacant' : working(s) ? 'lit' : 'dark'}" title="${esc(s.title)}"></i>`).join('')}</div>`).join('') + '</div>').join('') + '<div class="ground"></div>';
  const fl = org.floors.find(f => f.id === cur);
  $('#planTitle').textContent = `Plan · ${fl.id} ${fl.label}`;
  { const FL = floorLayout(); $("#plan").style.width = FL.width+"px"; $("#plan").style.height = FL.height+"px"; }
  $('#plan').innerHTML = planHTML(groups);
  $('#legend').innerHTML = org.departments.map(d => `<span style="background:${d.color}"></span>${esc(d.name)}`).join('') +
    ((org.groups||[]).length ? ' · Groups: ' + org.groups.map(g => esc(g.name)).join(', ') : '') +
    ' · At desk = working · In break area = not working · Empty desk = Open · Lit window = working';
}

function go(f) { if (org.floors.some(x => x.id === f)) { cur = f; render(); } }
document.addEventListener('click', e => { const t = e.target.closest('[data-f]'); if (t) go(t.dataset.f); });
document.addEventListener('keydown', e => { if (/^[1-9]$/.test(e.key)) go(e.key + 'F'); });

Promise.all([
  fetch('data/org.json').then(r => r.json()),
  (window.StatusAPI ? StatusAPI.loadStatus() : Promise.resolve(new Map())).catch(() => new Map())
]).then(([j, map]) => {
  org = j; statusMap = map; cur = org.floors[0].id; render();
  if (window.StatusAPI) setInterval(() => StatusAPI.loadStatus().then(m => { statusMap = m; render(); }).catch(() => {}), StatusAPI.REFRESH_MS);
}).catch(e => document.body.insertAdjacentHTML('beforeend', `<p>Unable to load the office. Serve this folder with python3 -m http.server 8765 and open http://127.0.0.1:8765/ (not file://). ${esc(e)}</p>`));
