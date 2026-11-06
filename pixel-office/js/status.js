// Binary position: working=true means at desk; otherwise in the break area.
// Reads only static JSON: data/status.live.json (written by the local bridge) first, else the mock.
(function (global) {
  const LIVE_URL = 'data/status.live.json';
  const MOCK_URL = 'data/status.mock.json';
  const STATUS_URL = LIVE_URL;
  const REFRESH_MS = 15000;
  function seatKey(seat) { return `${seat.floor}|${seat.department}|${seat.id || seat.title}`; }
  function fetchMap(url) {
    return fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('status fetch ' + r.status); return r.json(); })
      .then(file => {
        const list = Array.isArray(file) ? file : (file && Array.isArray(file.records) ? file.records : null);
        if (!list) throw new Error('invalid status file');
        const map = new Map(); list.forEach(r => { if (r && r.seatKey) map.set(r.seatKey, r); }); return map;
      });
  }
  function loadStatus(url) {
    if (url) return fetchMap(url);
    return fetchMap(LIVE_URL).catch(() => fetchMap(MOCK_URL));
  }
  function isWorking(seat, map) {
    const rec = seat && map && map.get(seatKey(seat));
    if (!rec) return false;
    if (typeof rec.working === 'boolean') return rec.working;
    return rec.state === 'working' || rec.state === 'busy';
  }
  global.StatusAPI = { STATUS_URL, LIVE_URL, MOCK_URL, REFRESH_MS, loadStatus, seatKey, isWorking };
})(window);
