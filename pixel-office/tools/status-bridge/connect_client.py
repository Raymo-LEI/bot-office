"""Minimal Connect-JSON client and independent browser sign-in for the status bridge.

Original stdlib-only code. It talks to an unpublished backend that may change
at any time; this is not an official API. Only these calls are made:
  - GET  /auth/poll                      (browser sign-in)
  - POST /oauth/token                    (token renewal)
  - POST aiserver.v1.DashboardService/GetMe            (sign-in confirmation only)
  - POST aiserver.v1.GrokBotService/ListGrokBotAgents
  - POST aiserver.v1.GrokBotService/ListGrokBotAgentStatuses
Tokens are stored only in session.json next to this file (mode 0600, gitignored).
"""
import base64, hashlib, json, os, platform, secrets, sys, tempfile, time, uuid, webbrowser
import urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION = os.path.join(HERE, 'session.json')
API = 'https://api2.cursor.sh'
LOGIN_PAGE = 'https://cursor.com/loginDeepControl'
# Public OAuth client id, as documented in public notes on this sign-in flow.
CLIENT_ID = 'KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB'
DEFAULT_CLIENT_VERSION = '0.75.0'
ALLOWED_RPCS = {
    'DashboardService/GetMe',
    'GrokBotService/ListGrokBotAgents',
    'GrokBotService/ListGrokBotAgentStatuses',
}
TIMEOUT = 30


class NotSignedIn(Exception):
    """No usable session: run login.py."""


class QueryError(Exception):
    """A backend call failed."""


class Unauthorized(QueryError):
    pass


def b64url(raw):
    return base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')


# ---- session file -------------------------------------------------------

def load_session(path=SESSION):
    if not os.path.exists(path):
        raise NotSignedIn('not signed in (no session file). Run: python3 tools/status-bridge/login.py')
    try:
        with open(path, encoding='utf-8') as f:
            s = json.load(f)
    except (OSError, ValueError):
        raise NotSignedIn('the session file is unreadable. Run: python3 tools/status-bridge/login.py')
    if not isinstance(s, dict) or not s.get('accessToken') or not s.get('machineId'):
        raise NotSignedIn('the session file is incomplete. Run: python3 tools/status-bridge/login.py')
    return s


def save_session(s, path=SESSION):
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=d, prefix='.session.', suffix='.tmp')
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(s, f, indent=2)
            f.write('\n')
        os.replace(tmp, path)
        os.chmod(path, 0o600)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def new_machine_id():
    return secrets.token_hex(32)  # 64 hex chars, generated locally


# ---- headers ------------------------------------------------------------

def checksum(machine_id, now_ms=None):
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    t = now_ms // 1_000_000
    buf = bytearray(t.to_bytes(6, 'big'))
    prev = 165
    for i in range(6):
        buf[i] = ((buf[i] ^ prev) + i) & 0xFF
        prev = buf[i]
    return b64url(bytes(buf)) + machine_id


def client_os():
    p = sys.platform
    if p == 'darwin':
        return 'darwin'
    if p.startswith('win'):
        return 'win32'
    return 'linux'


def client_version():
    return os.environ.get('OFFICE_CONNECT_CLIENT_VERSION') or DEFAULT_CLIENT_VERSION


def headers(session):
    v = client_version()
    ua_os = {'darwin': 'Macintosh; Intel Mac OS X 10_15_7', 'win32': 'Windows NT 10.0; Win64; x64'}.get(
        client_os(), 'X11; Linux x86_64')
    return {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        'authorization': 'Bearer ' + session['accessToken'],
        'user-agent': f'Mozilla/5.0 ({ua_os}) AppleWebKit/537.36 (KHTML, like Gecko) Sand/{v} Safari/537.36',
        'x-cursor-client-type': 'sand',
        'x-cursor-client-version': v,
        'x-cursor-client-os': client_os(),
        'x-cursor-client-source': 'sand-desktop',
        'x-sand-box-namespace': 'prod',
        'x-ghost-mode': 'true',
        'x-cursor-checksum': checksum(session['machineId']),
        'x-request-id': str(uuid.uuid4()),
    }


# ---- HTTP helpers -------------------------------------------------------

def _http(method, url, body=None, hdrs=None):
    data = None if body is None else json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs or {})
    if body is not None and 'Content-Type' not in req.headers:
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except (urllib.error.URLError, OSError) as e:
        raise QueryError('network error: ' + str(getattr(e, 'reason', e)))


def _json(raw):
    try:
        return json.loads(raw.decode('utf-8') or '{}')
    except ValueError:
        return None


# ---- token renewal ------------------------------------------------------

def jwt_exp(token):
    try:
        part = token.split('.')[1]
        part += '=' * (-len(part) % 4)
        return int(json.loads(base64.urlsafe_b64decode(part)).get('exp'))
    except Exception:
        return None


def needs_refresh(session, now=None):
    exp = jwt_exp(session.get('accessToken', ''))
    return exp is not None and exp - (now or time.time()) <= 60


def refresh(session, path=SESSION):
    rt = session.get('refreshToken')
    if not rt:
        raise NotSignedIn('the session cannot be renewed. Run: python3 tools/status-bridge/login.py')
    code, raw = _http('POST', API + '/oauth/token',
                      {'client_id': CLIENT_ID, 'grant_type': 'refresh_token', 'refresh_token': rt})
    body = _json(raw) or {}
    if body.get('shouldLogout'):
        raise NotSignedIn('the server ended this session. Run: python3 tools/status-bridge/login.py')
    if code != 200 or not body.get('access_token'):
        if code in (400, 401, 403):
            raise NotSignedIn(f'token renewal was refused (HTTP {code}). Run: python3 tools/status-bridge/login.py')
        raise QueryError(f'token renewal failed (HTTP {code})')
    session['accessToken'] = body['access_token']
    if body.get('refresh_token'):
        session['refreshToken'] = body['refresh_token']
    save_session(session, path)
    return session


# ---- Connect unary call -------------------------------------------------

def _post(session, rpc, body):
    code, raw = _http('POST', f'{API}/aiserver.v1.{rpc}', body, headers(session))
    if code == 200:
        out = _json(raw)
        if out is None:
            raise QueryError(f'{rpc}: response is not JSON')
        return out
    err = _json(raw) or {}
    if code == 401 or err.get('code') == 'unauthenticated':
        raise Unauthorized(f'{rpc}: unauthenticated')
    raise QueryError(f"{rpc} failed (HTTP {code}{', ' + str(err.get('code')) if err.get('code') else ''})")


def unary(session, rpc, body, path=SESSION):
    if rpc not in ALLOWED_RPCS:
        raise ValueError('RPC not allowed by this bridge: ' + rpc)
    if needs_refresh(session):
        refresh(session, path)
    try:
        return _post(session, rpc, body)
    except Unauthorized:
        refresh(session, path)  # one renewal, then one retry
        try:
            return _post(session, rpc, body)
        except Unauthorized:
            raise NotSignedIn('the session is no longer accepted. Run: python3 tools/status-bridge/login.py')


# ---- browser sign-in ----------------------------------------------------

def login(path=SESSION, window_s=600, interval_s=1.0, open_browser=True):
    verifier = b64url(secrets.token_bytes(32))
    challenge = b64url(hashlib.sha256(verifier.encode('ascii')).digest())
    login_id = str(uuid.uuid4())
    url = LOGIN_PAGE + '?' + urllib.parse.urlencode(
        {'challenge': challenge, 'uuid': login_id, 'mode': 'login', 'redirectTarget': 'cli'})
    print('Opening the sign-in page in your browser. If it does not open, visit:')
    print(url)
    if open_browser:
        webbrowser.open(url)
    poll = API + '/auth/poll?' + urllib.parse.urlencode({'uuid': login_id, 'verifier': verifier})
    deadline = time.time() + window_s
    while time.time() < deadline:
        try:
            code, raw = _http('GET', poll)
        except QueryError:
            code, raw = None, b''
        if code == 200:
            body = _json(raw) or {}
            if not body.get('accessToken'):
                raise QueryError('sign-in finished but no token was returned')
            old = {}
            try:
                old = load_session(path)
            except NotSignedIn:
                pass
            session = {
                'accessToken': body['accessToken'],
                'refreshToken': body.get('refreshToken'),
                'authId': body.get('authId'),
                'machineId': old.get('machineId') or new_machine_id(),
            }
            save_session(session, path)
            return session
        if code == 403:
            raise NotSignedIn('sign-in was refused (HTTP 403).')
        time.sleep(interval_s)
    raise NotSignedIn('timed out waiting for browser sign-in (about 10 minutes). Run login.py again.')
