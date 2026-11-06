#!/usr/bin/env python3
"""Offline tests for the status bridge. No network, no real sign-in.

Run from the pixel-office folder:  python3 tools/status-bridge/test_bridge.py
Each test copies the bridge into a temporary pixel-office tree with a synthetic
org.json (fake UUIDs), so the real data/ folder is never touched.
"""
import json, os, shutil, stat, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = ('bridge.py', 'connect_client.py', 'login.py', 'fixture.json')
U = '00000000-0000-4000-8000-0000000000%02d'

ORG = {'seats': [
    {'floor': '4F', 'department': 'exec', 'id': 'boss', 'title': 'Boss'},
    {'floor': '3F', 'department': 'office', 'title': 'Awaiting Head', 'agentId': U % 1},
    {'floor': '3F', 'department': 'optics', 'title': 'Running Head', 'agentId': U % 2},
    {'floor': '3F', 'department': 'painting', 'title': 'Top Running', 'agentId': (U % 3).upper()},
    {'floor': '2F', 'department': 'office', 'title': 'Tasks PM', 'agentId': U % 4},
    {'floor': '2F', 'department': 'optics', 'title': 'Subagent PM', 'agentId': U % 5},
    {'floor': '2F', 'department': 'painting', 'title': 'Idle PM', 'agentId': U % 6},
    {'floor': '1F', 'department': 'office', 'title': 'Unknown Worker', 'agentId': U % 7},
    {'floor': '1F', 'department': 'office', 'id': 'office-2', 'title': 'Open', 'vacant': True, 'agentId': U % 2},
]}


def make_tree():
    root = tempfile.mkdtemp(prefix='office-test-')
    sb = os.path.join(root, 'tools', 'status-bridge')
    os.makedirs(sb)
    os.makedirs(os.path.join(root, 'data'))
    for f in FILES:
        shutil.copy(os.path.join(HERE, f), sb)
    with open(os.path.join(root, 'data', 'org.json'), 'w') as f:
        json.dump(ORG, f)
    return root


def run(root, code):
    """Run python code inside the temp tree with bridge importable."""
    sb = os.path.join(root, 'tools', 'status-bridge')
    return subprocess.run([sys.executable, '-c', code], cwd=root, capture_output=True, text=True,
                          env={**os.environ, 'PYTHONPATH': sb, 'PYTHONDONTWRITEBYTECODE': '1'})


def put(path, text):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)


def get(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def live_path(root):
    return os.path.join(root, 'data', 'status.live.json')


class Mapping(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, HERE)
        import bridge
        self.b = bridge

    def test_states(self):
        s = self.b.state_of
        self.assertEqual(s({'live': {'awaiting': {'kind': 'q'}, 'isRunning': True}}), 'awaiting you')
        self.assertEqual(s({'live': {'isRunning': True}}), 'running')
        self.assertEqual(s({'isRunning': True}), 'running')
        self.assertEqual(s({'workingTaskIds': ['t']}), 'idle, background work')
        self.assertEqual(s({'live': {'subagents': [{}]}}), 'idle, background work')
        self.assertEqual(s({'live': {'workingTaskIds': ['t']}}), 'idle, background work')
        self.assertEqual(s({'live': {'awaiting': None, 'isRunning': False}, 'workingTaskIds': []}), 'idle')
        self.assertEqual(s({}), 'idle')

    def test_visual(self):
        w = self.b.is_working
        self.assertFalse(w({'live': {'awaiting': 'yes'}}))      # awaiting you -> break area
        self.assertTrue(w({'live': {'isRunning': True}}))       # running -> desk
        self.assertTrue(w({'isRunning': True}))
        self.assertTrue(w({'subagents': [{'id': 'x'}]}))        # background work -> desk
        self.assertTrue(w({'workingTaskIds': ['t1']}))
        self.assertFalse(w({'live': {}}))                       # idle -> break area

    def test_agent_uuid_prefers_uuid(self):
        self.assertEqual(self.b.agent_uuid({'id': '42', 'agentId': U % 9}), U % 9)
        self.assertIsNone(self.b.agent_uuid({'id': '42'}))
        self.assertEqual(self.b.agent_ids({'agents': [{'id': '7', 'agentId': U % 1}, {'agentId': U % 2}]}),
                         [U % 1, U % 2])

    def test_fixture_cli_writes_expected_records(self):
        root = make_tree()
        p = run(root, 'import bridge,sys; sys.exit(bridge.main(["--from-fixture","--once"]))')
        self.assertEqual(p.returncode, 0, p.stderr)
        got = {r['seatKey']: r['working'] for r in get(live_path(root))['records']}
        self.assertEqual(got, {
            '3F|office|Awaiting Head': False,
            '3F|optics|Running Head': True,
            '3F|painting|Top Running': True,   # agentId matched case-insensitively
            '2F|office|Tasks PM': True,
            '2F|optics|Subagent PM': True,
            '2F|painting|Idle PM': False,
        })  # Boss (no agentId), vacant seat, unknown agent: no record
        for r in get(live_path(root))['records']:
            self.assertEqual(set(r), {'seatKey', 'working', 'source', 'updatedAt'})
            self.assertEqual(r['source'], 'live')
        shutil.rmtree(root)


class FailurePaths(unittest.TestCase):
    def test_login_missing(self):
        root = make_tree()
        put(live_path(root), '{"records":[]}')
        p = run(root, 'import bridge,sys; sys.exit(bridge.main(["--once"]))')
        sys.stderr.write('[login-missing] exit=%d stderr=%s' % (p.returncode, p.stderr))
        self.assertNotEqual(p.returncode, 0)
        self.assertFalse(os.path.exists(live_path(root)))
        self.assertIn('not signed in', p.stderr)
        self.assertIn('mock status', p.stderr)
        shutil.rmtree(root)

    def test_query_failure(self):
        root = make_tree()
        put(live_path(root), '{"records":[]}')
        code = (
            'import bridge, connect_client as cc, sys\n'
            'cc.save_session({"accessToken":"fake","refreshToken":"fake","machineId":"0"*64})\n'
            'def boom(*a, **k): return 503, b\'{"code":"unavailable"}\'\n'
            'cc._http = boom\n'
            'sys.exit(bridge.main(["--once"]))\n')
        p = run(root, code)
        sys.stderr.write('[query-failure] exit=%d stderr=%s' % (p.returncode, p.stderr))
        self.assertNotEqual(p.returncode, 0)
        self.assertFalse(os.path.exists(live_path(root)))
        self.assertIn('query failed', p.stderr)
        shutil.rmtree(root)

    def test_should_logout(self):
        root = make_tree()
        put(live_path(root), '{"records":[]}')
        code = (
            'import bridge, connect_client as cc, sys\n'
            'cc.save_session({"accessToken":"fake","refreshToken":"fake","machineId":"0"*64})\n'
            'def h(m, url, *a, **k):\n'
            '    if url.endswith("/oauth/token"): return 200, b\'{"shouldLogout":true}\'\n'
            '    return 401, b\'{"code":"unauthenticated"}\'\n'
            'cc._http = h\n'
            'sys.exit(bridge.main(["--once"]))\n')
        p = run(root, code)
        sys.stderr.write('[should-logout] exit=%d stderr=%s' % (p.returncode, p.stderr))
        self.assertNotEqual(p.returncode, 0)
        self.assertFalse(os.path.exists(live_path(root)))
        self.assertIn('ended this session', p.stderr)
        shutil.rmtree(root)

    def test_401_refresh_then_success(self):
        root = make_tree()
        code = (
            'import bridge, connect_client as cc, sys, json, os, stat\n'
            'cc.save_session({"accessToken":"old","refreshToken":"r1","machineId":"0"*64})\n'
            'calls=[]\n'
            'def h(m, url, body=None, hdrs=None):\n'
            '    calls.append(url.rsplit("/",1)[-1])\n'
            '    if url.endswith("/oauth/token"): return 200, b\'{"access_token":"new","refresh_token":"r2"}\'\n'
            '    if hdrs["authorization"] != "Bearer new": return 401, b"{}"\n'
            '    if url.endswith("ListGrokBotAgents"): return 200, json.dumps({"agents":[{"agentId":"%s"}]}).encode()\n'
            '    return 200, json.dumps({"statuses":[{"agentId":"%s","live":{"isRunning":True}}]}).encode()\n'
            'cc._http = h\n'
            'rc = bridge.main(["--once"])\n'
            's = json.load(open(cc.SESSION))\n'
            'assert s["accessToken"]=="new" and s["refreshToken"]=="r2", "tokens not renewed"\n'
            'assert stat.S_IMODE(os.stat(cc.SESSION).st_mode)==0o600, "session mode"\n'
            'assert calls.count("token")==1, calls\n'
            'sys.exit(rc)\n') % (U % 2, U % 2)
        p = run(root, code)
        self.assertEqual(p.returncode, 0, p.stderr)
        recs = get(live_path(root))['records']
        self.assertEqual(recs[0]['seatKey'], '3F|optics|Running Head')
        self.assertTrue(recs[0]['working'])
        shutil.rmtree(root)


class Protocol(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, HERE)
        import connect_client
        self.cc = connect_client

    def test_checksum_shape(self):
        mid = 'ab' * 32
        c = self.cc.checksum(mid, now_ms=1_700_000_000_000)
        self.assertTrue(c.endswith(mid))
        self.assertEqual(len(c), 8 + 64)  # 6 bytes -> 8 base64url chars, no padding
        # independent recomputation of the documented steps
        t = 1_700_000_000_000 // 1_000_000
        b, prev = bytearray(t.to_bytes(6, 'big')), 165
        for i in range(6):
            b[i] = ((b[i] ^ prev) + i) & 0xFF
            prev = b[i]
        import base64
        self.assertEqual(c[:8], base64.urlsafe_b64encode(bytes(b)).decode().rstrip('='))

    def test_headers(self):
        h = self.cc.headers({'accessToken': 'x', 'machineId': '0' * 64})
        self.assertEqual(h['x-cursor-client-type'], 'sand')
        self.assertIn('Sand/', h['user-agent'])
        self.assertEqual(h['Connect-Protocol-Version'], '1')
        self.assertIn(h['x-cursor-client-os'], ('darwin', 'linux', 'win32'))

    def test_rpc_allowlist(self):
        with self.assertRaises(ValueError):
            self.cc.unary({'accessToken': 'x', 'machineId': '0' * 64}, 'GrokBotService/SendGrokBotUserMessage', {})

    def test_session_mode(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, 'session.json')
        self.cc.save_session({'accessToken': 'a', 'machineId': '0' * 64}, p)
        self.assertEqual(stat.S_IMODE(os.stat(p).st_mode), 0o600)
        shutil.rmtree(d)


if __name__ == '__main__':
    unittest.main(verbosity=2)
