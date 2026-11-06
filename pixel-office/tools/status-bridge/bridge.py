#!/usr/bin/env python3
"""Local-only status bridge: agent status -> data/status.live.json.

Runs on your own machine with your own independent sign-in
(python3 tools/status-bridge/login.py). It asks an unpublished backend for
your bots and their status; that backend is not an official API and may change.
Writes ONLY {records:[{seatKey, working, source, updatedAt}]}; never raw responses.
If you are not signed in or a query fails, it removes data/status.live.json so the
page falls back to mock status.
"""
import argparse, json, os, re, sys, tempfile, time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import connect_client as cc  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ORG = os.path.join(ROOT, 'data', 'org.json')
LIVE = os.path.join(ROOT, 'data', 'status.live.json')
FIXTURE = os.path.join(HERE, 'fixture.json')
UUID_RE = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

AWAITING, RUNNING, BACKGROUND, IDLE = 'awaiting you', 'running', 'idle, background work', 'idle'
WORKING_STATES = {RUNNING, BACKGROUND}


def _present(v):
    return bool(v)  # None, False, '', [], {} and 0 count as absent


def state_of(row):
    """Documented STATE for one status row."""
    live = row.get('live') if isinstance(row.get('live'), dict) else {}
    if _present(live.get('awaiting')):
        return AWAITING
    if _present(live.get('isRunning')) or _present(row.get('isRunning')):
        return RUNNING
    for src in (row, live):
        if _present(src.get('subagents')) or _present(src.get('workingTaskIds')):
            return BACKGROUND
    return IDLE


def is_working(row):
    return state_of(row) in WORKING_STATES


def _list(obj, keys):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in keys:
            if isinstance(obj.get(k), list):
                return obj[k]
    return None


def agent_uuid(a):
    """Prefer a UUID-looking agentId; never prefer a numeric id over it."""
    for k in ('agentId', 'uuid', 'id'):
        v = a.get(k)
        if isinstance(v, str) and UUID_RE.match(v):
            return v.lower()
    return None


def agent_ids(resp):
    agents = _list(resp, ('agents', 'items'))
    if agents is None:
        raise cc.QueryError('ListGrokBotAgents returned no agent list')
    return sorted({u for u in (agent_uuid(a) for a in agents if isinstance(a, dict)) if u})


def status_rows(resp):
    rows = _list(resp, ('statuses', 'agents', 'items'))
    if rows is None:
        raise cc.QueryError('ListGrokBotAgentStatuses returned no status list')
    out = {}
    for r in rows:
        if isinstance(r, dict):
            u = agent_uuid(r)
            if u:
                out[u] = r
    return out


def seat_key(s):
    return f"{s['floor']}|{s['department']}|{s.get('id') or s['title']}"


def build(rows_by_id, org_path=None):
    with open(org_path or ORG, encoding='utf-8') as f:
        seats = json.load(f)['seats']
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    records = []
    for s in seats:
        aid = s.get('agentId')
        if not aid or s.get('vacant'):
            continue
        row = rows_by_id.get(str(aid).lower())
        if row is None:
            continue
        records.append({'seatKey': seat_key(s), 'working': is_working(row), 'source': 'live', 'updatedAt': now})
    return {'records': records}


def query():
    session = cc.load_session()
    ids = agent_ids(cc.unary(session, 'GrokBotService/ListGrokBotAgents', {}))
    if not ids:
        return {}
    return status_rows(cc.unary(session, 'GrokBotService/ListGrokBotAgentStatuses', {'agentIds': ids}))


def write(data):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(LIVE), prefix='.status.live.', suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    os.replace(tmp, LIVE)


def drop_live():
    try:
        os.remove(LIVE)
        return True
    except FileNotFoundError:
        return False


def once(fixture=None):
    try:
        if fixture:
            with open(fixture, encoding='utf-8') as f:
                rows = status_rows(json.load(f))
        else:
            rows = query()
        data = build(rows)
    except cc.NotSignedIn as e:
        removed = drop_live()
        print('status-bridge: live status unavailable: ' + str(e) +
              ('; removed data/status.live.json' if removed else '') + '; the page will use mock status.',
              file=sys.stderr)
        return 2
    except (cc.QueryError, ValueError, OSError, KeyError) as e:
        removed = drop_live()
        print('status-bridge: live status unavailable: query failed: ' + str(e) +
              ('; removed data/status.live.json' if removed else '') + '; the page will use mock status.',
              file=sys.stderr)
        return 1
    write(data)
    print(f"status-bridge: wrote {len(data['records'])} records to {os.path.relpath(LIVE, ROOT)}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from-fixture', nargs='?', const=FIXTURE, metavar='PATH',
                    help='read a ListGrokBotAgentStatuses-shaped JSON file instead of the network')
    ap.add_argument('--once', action='store_true', help='poll once and exit (non-zero on failure)')
    ap.add_argument('--interval', type=float, default=15, help='seconds between polls (default 15)')
    a = ap.parse_args(argv)
    if a.once or a.from_fixture:
        return once(a.from_fixture)
    while True:
        try:
            once(None)
        except Exception as e:  # never die on a single bad poll
            drop_live()
            print('status-bridge: unexpected error: ' + type(e).__name__ + '; the page will use mock status.',
                  file=sys.stderr)
        sys.stderr.flush(); sys.stdout.flush()
        time.sleep(max(1, a.interval))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
