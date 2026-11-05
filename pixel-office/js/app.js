// org.json 驱动布局；StatusAPI 二元位置：工作=工位人物，不工作=休息区人物
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

function personHTML(seat, color, x, y, where) {
  const short = seat.title; // full name; desk tokens hide label (desk already shows title)
  return `<div class="person at-${where}" style="left:${x}px;top:${y}px" title="${esc(seat.title)} · ${where === 'desk' ? '工作' : '不工作'}">` +
    `<i class="p-head"></i><i class="p-body" style="background:${color}"></i>` +
    `<em>${esc(short)}</em></div>`;
}

function planHTML(groups) {
  const L = org.layout, dm = Object.fromEntries(org.departments.map(d => [d.id, d]));
  let h = R(L.corridor, 'p-corr', '', `<span>${esc(L.corridor.label||'')}</span>`) +
    R(L.core, 'p-core', '', `<span>${esc(L.core.label)}</span>`) +
    R(L.lobby, 'p-lobby', '', `<span>${esc(L.lobby.label)}</span><i class="rec"></i>`);
  if (L.rest) h += R(L.rest, 'p-rest', '', `<span class="lbl">${esc(L.rest.label||'休息区')}</span>`);
  (L.rooms||[]).forEach(r => { const d = dm[r.department];
    h += R(r, 'p-room' + (d ? '' : ' p-misc'), d ? `background:${d.color}44;border-color:${d.color}` : '',
      `<span class="lbl" style="${d?`background:${d.color}`:''}">${esc(r.label)}</span><i class="door"></i>`); });

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
    h += `<div class="desk f${k.facing||'S'} ${s.vacant?'vacant':''}" style="left:${k.x}px;top:${k.y}px">` +
      `<b style="background:${s.vacant?'transparent':d.color}"></b><i class="chair"></i>` +
      `<em>${esc(s.title)}${s.groupId?`<small>${esc((groups[s.groupId]||{}).name||s.groupId)}</small>`:''}</em></div>`;
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
  $('#planTitle').textContent = `平面 · ${fl.id} ${fl.label}`;
  $('#plan').style.width = org.layout.width+'px'; $('#plan').style.height = org.layout.height+'px';
  $('#plan').innerHTML = planHTML(groups);
  $('#legend').innerHTML = org.departments.map(d => `<span style="background:${d.color}"></span>${esc(d.name)}`).join('') +
    ((org.groups||[]).length ? ' · 项目组：' + org.groups.map(g => esc(g.name)).join('、') : '') +
    ' · 人物在工位=工作 · 人物在休息区=不工作 · 空桌=待招';
}

function go(f) { if (org.floors.some(x => x.id === f)) { cur = f; render(); } }
document.addEventListener('click', e => { const t = e.target.closest('[data-f]'); if (t) go(t.dataset.f); });
document.addEventListener('keydown', e => { if (/^[1-9]$/.test(e.key)) go(e.key + 'F'); });

Promise.all([
  fetch('data/org.json').then(r => r.json()),
  (window.StatusAPI ? StatusAPI.loadStatus() : Promise.resolve(new Map())).catch(() => new Map())
]).then(([j, map]) => {
  org = j; statusMap = map; cur = org.floors[0].id; render();
}).catch(e => document.body.insertAdjacentHTML('beforeend', `<p>加载失败（需用 http.server 打开）：${e}</p>`));
