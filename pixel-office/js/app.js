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

// Status appearance overrides seat appearance; fallback uses shape, color and capsule eyes.
const SHAPES = new Set(['wedge', 'teardrop', 'hex', 'blob', 'cloud', 'round', 'square']);
const EYE = '#FFF6E8';

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

function shapeSVG(shape, color) {
  const f = esc(color);
  let body = `<circle cx="16" cy="16" r="14" fill="${f}"/>`;
  let eyes = `<g fill="${EYE}" transform="rotate(-16 20 15)"><rect x="16.2" y="11.2" width="2.8" height="7.2" rx="1.4"/><rect x="21" y="10.8" width="2.8" height="7.2" rx="1.4"/></g>`;
  if (shape === 'wedge') {
    body = `<polygon points="7,7 25,16 7,25" fill="${f}" stroke="${f}" stroke-width="7" stroke-linejoin="round"/>`;
    eyes = `<g fill="${EYE}" transform="rotate(-22 20 15)"><rect x="13.2" y="13.4" width="6.8" height="2.7" rx="1.35"/><rect x="20.8" y="12.6" width="6.8" height="2.7" rx="1.35"/></g>`;
  } else if (shape === 'teardrop') {
    body = `<path transform="rotate(-40 16 17)" d="M16 3C16 3 5.5 15 5.5 21a10.5 10.5 0 1 0 21 0C26.5 15 16 3 16 3Z" fill="${f}"/>`;
    eyes = `<g fill="${EYE}" transform="rotate(-14 20 18)"><rect x="16.6" y="14.2" width="2.8" height="7" rx="1.4"/><rect x="21.4" y="13.8" width="2.8" height="7" rx="1.4"/></g>`;
  } else if (shape === 'hex') {
    body = `<polygon points="16,2.4 27.8,9.2 27.8,22.8 16,29.6 4.2,22.8 4.2,9.2" fill="${f}"/>`;
    eyes = `<g fill="${EYE}"><rect x="12.2" y="11.6" width="2.8" height="8.4" rx="1.4"/><rect x="17" y="11.6" width="2.8" height="8.4" rx="1.4"/></g>`;
  } else if (shape === 'cloud') {
    body = `<g fill="${f}"><circle cx="10" cy="19" r="8"/><circle cx="19.2" cy="20" r="7.4"/><circle cx="15" cy="13" r="8.6"/><circle cx="7.4" cy="14.2" r="6"/><circle cx="23.2" cy="14.6" r="6.1"/></g>`;
    eyes = `<g fill="${EYE}" transform="rotate(-8 19 16)"><rect x="15.6" y="12.4" width="2.7" height="6.6" rx="1.35"/><rect x="20.2" y="12.1" width="2.7" height="6.6" rx="1.35"/></g>`;
  } else if (shape === 'square') {
    body = `<rect x="3" y="3" width="26" height="26" rx="3" fill="${f}"/>`;
    eyes = `<g fill="${EYE}" transform="rotate(-10 19 15)"><rect x="15.6" y="11.5" width="2.8" height="7.2" rx="1.4"/><rect x="20.5" y="11.2" width="2.8" height="7.2" rx="1.4"/></g>`;
  }
  return `<svg viewBox="-1 -1 34 34" class="p-shape" aria-hidden="true">${body}${eyes}</svg>`;
}

function personHTML(seat, color, x, y, where) {
  const a = appearance(seat);
  const fill = a.color || color;
  const shape = a.shape;
  const head = a.url
    ? `<i class="p-head has-img shape-${esc(shape)}" style="background-image:url('${esc(cssUrl(a.url))}');background-color:${esc(fill)}"></i>`
    : `<span class="p-head shape-${esc(shape)}">${shapeSVG(shape, fill)}</span>`;
  return `<div class="person at-${where}" style="left:${x}px;top:${y}px" title="${esc(seat.title)} · ${where === 'desk' ? 'working' : 'not working'}">` +
    head +
    `<i class="p-body" style="background:${esc(fill)}"></i><i class="p-legs"></i>` +
    `<em>${esc(seat.title)}</em></div>`;
}

function floorLayout() { return Object.assign({}, org.layout, (org.layoutByFloor && org.layoutByFloor[cur]) || {}); }
function planHTML(groups) {
  const L = floorLayout(), dm = Object.fromEntries(org.departments.map(d => [d.id, d]));
  let h = R(L.corridor, 'p-corr', '', `<span>${esc(L.corridor.label||'')}</span>`) +
    R(L.core, 'p-core', '', `<span>${esc(L.core.label)}</span>`) +
    R(L.lobby, 'p-lobby', '', `<span class="area-label">${esc(L.lobby.label)}</span><i class="rec"><i class="rec-screen"></i><i class="rec-book"></i></i><i class="plant lobby-plant"></i><i class="entry-mat"></i>`);
  if (L.rest) h += R(L.rest, 'p-rest', '', `<span class="lbl">${esc(L.rest.label||'Break area')}</span><i class="sofa"></i><i class="coffee-table"><i class="cup"></i></i><i class="wall-clock"></i>`);
  (L.rooms||[]).forEach(r => { const d = dm[r.department];
    h += R(r, 'p-room' + (d ? ` dept-${esc(d.id)}` : ' p-misc'), d ? `--dept-color:${d.color}` : '',
      `<i class="rug"></i><span class="lbl" style="${d?`background:${d.color}`:''}">${esc(r.label)}</span><i class="window"></i><i class="wall-art"></i><i class="shelf"></i><i class="plant"></i><i class="side-table"><i class="cup"></i></i><i class="door"></i>`); });

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
    // desk always drawn
    const away = !s.vacant && !working(s);
    h += `<div class="desk f${k.facing||'S'} ${s.vacant?'vacant':''}${away?' away':''}" style="left:${k.x}px;top:${k.y}px">` +
      `<b class="top"></b><i class="desk-leg leg-left"></i><i class="desk-leg leg-right"></i><i class="monitor"></i><i class="keyboard"></i><i class="mug"></i><i class="chair"></i>` +
      `<em>${esc(s.title)}${away?'<i class="away-tag">(Away)</i>':''}${s.groupId?`<small>${esc((groups[s.groupId]||{}).name||s.groupId)}</small>`:''}</em></div>`;
    // vacant: empty desk, no person
    if (s.vacant) return;
    if (working(s)) {
      // person at desk (offset into desk box)
      const px = k.x + 28, py = (k.facing === 'N') ? k.y + 4 : k.y + 36;
      h += personHTML(s, d.color, px, py, 'desk');
    } else {
      const rs = restSlots[restIdx++];
      if (rs) h += personHTML(s, d.color, rs.x, rs.y, 'rest');
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
      `<div class="bay" style="background-color:${c.dept.color}">${seatsOf(f.id, c.dept.id).map(s => {
        if (s.vacant) return '◌';
        return working(s) ? '■' : '□';
      }).join(' ')}</div>`).join('') + '</div>').join('') + '<div class="ground"></div>';
  const fl = org.floors.find(f => f.id === cur);
  $('#planTitle').textContent = `Plan · ${fl.id} ${fl.label}`;
  { const FL = floorLayout(); $("#plan").style.width = FL.width+"px"; $("#plan").style.height = FL.height+"px"; }
  $('#plan').innerHTML = planHTML(groups);
  $('#legend').innerHTML = org.departments.map(d => `<span style="background:${d.color}"></span>${esc(d.name)}`).join('') +
    ((org.groups||[]).length ? ' · Groups: ' + org.groups.map(g => esc(g.name)).join(', ') : '') +
    ' · Person at desk = working · Person in break area = not working · Empty desk = Open';
}

function go(f) { if (org.floors.some(x => x.id === f)) { cur = f; render(); } }
document.addEventListener('click', e => { const t = e.target.closest('[data-f]'); if (t) go(t.dataset.f); });
document.addEventListener('keydown', e => { if (/^[1-9]$/.test(e.key)) go(e.key + 'F'); });

Promise.all([
  fetch('data/org.json').then(r => r.json()),
  (window.StatusAPI ? StatusAPI.loadStatus() : Promise.resolve(new Map())).catch(() => new Map())
]).then(([j, map]) => {
  org = j; statusMap = map; cur = org.floors[0].id; render();
}).catch(e => document.body.insertAdjacentHTML('beforeend', `<p>Unable to load the office. Serve this folder with python3 -m http.server 8765 and open http://127.0.0.1:8765/ (not file://). ${esc(e)}</p>`));
