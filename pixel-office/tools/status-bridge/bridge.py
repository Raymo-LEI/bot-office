#!/usr/bin/env python3
"""Local-only status bridge: `grokbot status --json` -> data/status.live.json.

Runs on the user's own machine with their own grokbot login. Not for a public page.
The grokbot CLI output is undocumented and may change with the client.
Writes ONLY {records:[{seatKey, working, source, updatedAt}]}; never raw CLI output.
"""
import argparse, json, os, subprocess, sys, tempfile, time
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ORG = os.path.join(ROOT, 'data', 'org.json')
LIVE = os.path.join(ROOT, 'data', 'status.live.json')
FIXTURE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixture.json')
CMD = ['grokbot', 'status', '--json']
WORKING = {'running', 'background work'}
LIST_KEYS = ('agents', 'bots', 'items', 'data', 'results', 'statuses')
ID_KEYS = ('id', 'agentId', 'agent_id', 'uuid')
STATUS_KEYS = ('status', 'state')


def norm(s):
    return ' '.join(str(s).lower().replace('_', ' ').replace('-', ' ').split())


def is_working(label):
    # awaiting you / idle / unknown -> False. computer/asleep fields are ignored.
    return norm(label) in WORKING


def summarize(obj):
    if isinstance(obj, dict):
        return '{' + ', '.join(f'{k}: {type(v).__name__}' for k, v in list(obj.items())[:30]) + '}'
    return type(obj).__name__


def agent_list(obj):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in LIST_KEYS:
            if isinstance(obj.get(k), list):
                return obj[k]
    return None


def first(d, keys):
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v:
            return v
    return None


def seat_key(s):
    return f"{s['floor']}|{s['department']}|{s.get('id') or s['title']}"


def build(obj):
    agents = agent_list(obj)
    if agents is None:
        raise ValueError('no agent list; top-level: ' + summarize(obj))
    items = [a for a in agents if isinstance(a, dict) and first(a, ID_KEYS)]
    if not items:
        raise ValueError('no recognizable agents; top-level: ' + summarize(obj))
    by_id = {first(a, ID_KEYS).lower(): a for a in items}
    seats = json.load(open(ORG, encoding='utf-8'))['seats']
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')
    records = []
    for s in seats:
        aid = s.get('agentId')
        if not aid or s.get('vacant'):
            continue
        a = by_id.get(aid.lower())
        if a is None:
            continue  # unmapped seat: no record -> page shows not working
        records.append({'seatKey': seat_key(s), 'working': is_working(first(a, STATUS_KEYS) or ''),
                        'source': 'live', 'updatedAt': now})
    return {'records': records}


def write(data):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(LIVE), prefix='.status.live.', suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    os.replace(tmp, LIVE)


def read_cli():
    try:
        p = subprocess.run(CMD, capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        raise RuntimeError('command not found: ' + ' '.join(CMD))
    except subprocess.TimeoutExpired:
        raise RuntimeError('timeout: ' + ' '.join(CMD))
    if p.returncode != 0:
        raise RuntimeError(f"{' '.join(CMD)} exited {p.returncode}")
    return p.stdout


def once(fixture):
    try:
        text = open(fixture, encoding='utf-8').read() if fixture else read_cli()
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            raise ValueError('output is not JSON')
        data = build(obj)
    except (RuntimeError, ValueError, OSError) as e:
        print('status-bridge: ' + str(e) + '; live file not written', file=sys.stderr)
        return 1
    write(data)
    print(f"status-bridge: wrote {len(data['records'])} records to {os.path.relpath(LIVE, ROOT)}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from-fixture', nargs='?', const=FIXTURE, metavar='PATH')
    ap.add_argument('--once', action='store_true')
    ap.add_argument('--interval', type=float, default=15)
    a = ap.parse_args()
    if a.once or a.from_fixture:
        return once(a.from_fixture)
    while True:
        once(None)
        time.sleep(max(1, a.interval))


if __name__ == '__main__':
    sys.exit(main())
