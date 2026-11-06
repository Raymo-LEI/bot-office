#!/usr/bin/env python3
"""One-time browser sign-in for the local status bridge.

Run from the pixel-office folder:  python3 tools/status-bridge/login.py
Creates an independent session (it does not reuse or touch the desktop app's
login) and stores it in tools/status-bridge/session.json (mode 0600, gitignored).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import connect_client as cc


def main():
    try:
        session = cc.login()
    except (cc.NotSignedIn, cc.QueryError) as e:
        print('login: ' + str(e), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('login: cancelled.', file=sys.stderr)
        return 1
    try:
        cc.unary(session, 'DashboardService/GetMe', {})
    except (cc.NotSignedIn, cc.QueryError) as e:
        print('login: tokens were saved, but the sign-in check failed: ' + str(e), file=sys.stderr)
        return 1
    print('Signed in. Start the office with start-office.command or python3 tools/status-bridge/bridge.py.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
