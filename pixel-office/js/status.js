// Binary position: working=true means at desk; otherwise in the break area.
(function (global) {
  const STATUS_URL = 'data/status.mock.json';
  function seatKey(seat) { return `${seat.floor}|${seat.department}|${seat.title}`; }
  function loadStatus(url) {
    return fetch(url || STATUS_URL).then(r => { if (!r.ok) throw new Error('status fetch ' + r.status); return r.json(); })
      .then(file => { const map = new Map(); (Array.isArray(file) ? file : (file.records || [])).forEach(r => { if (r && r.seatKey) map.set(r.seatKey, r); }); return map; });
  }
  // Legacy mapping: busy -> true; idle/unknown -> false.
  function isWorking(seat, map) {
    const rec = seat && map && map.get(seatKey(seat));
    if (!rec) return false;
    if (typeof rec.working === 'boolean') return rec.working;
    return rec.state === 'working' || rec.state === 'busy';
  }
  global.StatusAPI = { STATUS_URL, loadStatus, seatKey, isWorking };
})(window);
