// Floors, rooms, and desks come from data/org.json.
// Status JSON only moves people between two places:
//   busy / working -> at that seat's computer
//   idle / not-working / unknown / missing -> rest area on the same floor
let org, cur;
let statusMap = {};
let statusMeta = { url: 'data/status.mock.json', ok: false, error: '' };

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function statusUrl() {
  const q = new URLSearchParams(location.search).get('status');
  if (!q) return 'data/status.mock.json';
  if (/^https?:\/\//i.test(q)) return q;
  if (/^[a-zA-Z0-9_./-]+$/.test(q) && !q.includes('..')) return q;
  return 'data/status.mock.json';
}

function columns() {
  const cols = org.departments.map(d => ({ dept: d }));
  cols.splice(0, 0, { core: true });
  return cols;
}

const R = (b, cls, style = '', inner = '') =>
  `<div class="${cls}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;${style}">${inner}</div>`;

function isWorking(seat) {
  const v = String(statusMap[seat.id] || '').toLowerCase();
  return v === 'working' || v === 'busy';
}

function actorHTML(color) {
  return `<span class="actor"><i class="hd"></i><i class="bd" style="background:${color}"></i><i class="lg"></i></span>`;
}

function restGeometry() {
  const area = org.layout.restArea;
  if (!area) return null;
  const room = (org.layout.rooms || []).find(r => r.id === area.roomId);
  return {
    ...area,
    x: room ? room.x : area.x,
    y: room ? room.y : area.y,
    w: room ? room.w : area.w,
    h: room ? room.h : area.h
  };
}

function slotFor(area, i) {
  const slots = area.slots || [];
  if (slots[i]) return slots[i];
  return { x: area.x + 12, y: area.y + 32 + i * 40 };
}

function planHTML(groups) {
  const L = org.layout;
  const dm = Object.fromEntries(org.departments.map(d => [d.id, d]));
  const rest = restGeometry();
  let h = R(L.corridor, 'p-corr', '', `<span>${esc(L.corridor.label || '')}</span>`)
    + R(L.core, 'p-core', '', `<span>${esc(L.core.label)}</span>`)
    + R(L.lobby, 'p-lobby', '', `<span>${esc(L.lobby.label)}</span><i class="rec"></i>`);
  (L.rooms || []).forEach(r => {
    const d = dm[r.department];
    const isRest = r.kind === 'rest' || (rest && r.id === rest.roomId);
    h += R(
      r,
      'p-room' + (d ? '' : ' p-misc') + (isRest ? ' p-rest' : ''),
      d ? `background:${d.color}44;border-color:${d.color}` : '',
      `<span class="lbl" style="${d ? `background:${d.color}` : ''}">${esc(r.label)}</span><i class="door"></i>`
    );
  });
  if (rest) {
    h += `<div class="plant" style="left:${rest.x + rest.w - 26}px;top:${rest.y + 8}px" title="休息区"></div>`;
  }
  const used = {};
  const away = [];
  org.seats.filter(s => s.floor === cur).forEach(s => {
    const slots = L.deskSlots.filter(k => k.department === s.department);
    const k = slots[used[s.department] = (used[s.department] || 0)];
    used[s.department]++;
    if (!k) return;
    const d = dm[s.department] || { color: '#999' };
    const working = !s.vacant && isWorking(s);
    if (!s.vacant && !working) away.push({ seat: s, dept: d });
    const place = s.vacant ? '' : (working ? ' · 工作中' : ' · 未在工作');
    h += `<div class="desk f${k.facing || 'S'} ${s.vacant ? 'vacant' : ''} ${!s.vacant && !working ? 'away' : ''}" style="left:${k.x}px;top:${k.y}px" title="${esc(s.title)}${place}">`
      + `<b style="background:${s.vacant ? 'transparent' : d.color}"></b>`
      + (s.vacant ? '' : '<i class="mon"></i>')
      + '<i class="chair"></i>'
      + (working ? actorHTML(d.color) : '')
      + `<em>${esc(s.title)}${s.groupId ? `<small>${esc((groups[s.groupId] || {}).name || s.groupId)}</small>` : ''}</em></div>`;
  });
  away.forEach((a, i) => {
    if (!rest) return;
    const slot = slotFor(rest, i);
    h += `<div class="person" style="left:${slot.x}px;top:${slot.y}px" title="${esc(a.seat.title)} · 未在工作">`
      + actorHTML(a.dept.color) + `<em>${esc(a.seat.title)}</em></div>`;
  });
  return h;
}

function seatsOf(f, d) {
  return org.seats.filter(s => s.floor === f && s.department === d);
}

function renderStatus() {
  const el = $('#statusLine');
  if (!el) return;
  const staffed = org.seats.filter(s => s.floor === cur && !s.vacant);
  const working = staffed.filter(isWorking).length;
  const resting = staffed.length - working;
  const src = statusMeta.ok
    ? `状态源 ${statusMeta.url}`
    : `状态源不可用（${statusMeta.error}），有人的座位改画在休息区`;
  el.textContent = `${src} · 本层 ${working} 人在工位，${resting} 人在休息区`;
  el.classList.toggle('bad', !statusMeta.ok);
}

function render() {
  const groups = Object.fromEntries((org.groups || []).map(g => [g.id, g]));
  $('#switch').innerHTML = org.floors.map(f =>
    `<button data-f="${f.id}" class="${f.id === cur ? 'on' : ''}">${f.id} ${esc(f.label)}</button>`).join('');
  $('#building').innerHTML = org.floors.map(f =>
    `<div class="storey ${f.id === cur ? 'on' : ''}" data-f="${f.id}"><span class="tag">${f.id}</span>`
    + columns().map(c => c.core
      ? `<div class="core">${esc(org.layout.core.label)}</div>`
      : `<div class="bay" style="background-color:${c.dept.color}">${seatsOf(f.id, c.dept.id).map(s => s.vacant ? '◌' : '■').join(' ')}</div>`
    ).join('') + '</div>').join('') + '<div class="ground"></div>';
  const fl = org.floors.find(f => f.id === cur);
  $('#planTitle').textContent = `平面 · ${fl.id} ${fl.label}`;
  $('#plan').style.width = org.layout.width + 'px';
  $('#plan').style.height = org.layout.height + 'px';
  $('#plan').innerHTML = planHTML(groups);
  const groupsHtml = (org.groups || []).length
    ? ' · 项目组：' + org.groups.map(g => esc(g.name)).join('、')
    : '';
  $('#legend').innerHTML = org.departments.map(d => `<span style="background:${d.color}"></span>${esc(d.name)}`).join('')
    + groupsHtml
    + '<span class="key-work"></span>人在电脑前 = 工作中'
    + '<span class="key-rest"></span>人在休息区 = 未在工作'
    + '<span class="key-vacant"></span>虚线工位 = 待招';
  renderStatus();
}

function go(f) {
  if (org.floors.some(x => x.id === f)) { cur = f; render(); }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-f]');
  if (t) go(t.dataset.f);
});
document.addEventListener('keydown', e => {
  if (/^[1-9]$/.test(e.key)) go(e.key + 'F');
});

function loadStatus(url) {
  statusMeta = { url, ok: false, error: '' };
  return fetch(url, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(j => {
    const seats = j && j.seats;
    if (!seats || typeof seats !== 'object' || Array.isArray(seats)) throw new Error('seats 必须是对象');
    statusMap = seats;
    statusMeta.ok = true;
  }).catch(e => {
    statusMap = {};
    statusMeta.ok = false;
    statusMeta.error = e.message || String(e);
  });
}

Promise.all([
  fetch('data/org.json', { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }),
  loadStatus(statusUrl())
]).then(([j]) => {
  org = j;
  cur = org.floors[0].id;
  render();
}).catch(e => {
  document.body.insertAdjacentHTML('beforeend',
    `<p class="hint bad">加载 org.json 失败（需用 http.server 打开）：${esc(e.message || e)}</p>`);
});
