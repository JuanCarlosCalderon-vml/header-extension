#!/usr/bin/env python3
"""Tiny local echo server for testing Header Tool.

It returns the exact HTTP request headers it received, so you can visually
confirm that the extension injected your custom header.

Usage:
    python3 test/echo-server.py            # serves on http://localhost:8099
    python3 test/echo-server.py 7100       # custom port

Then, in Header Tool:
    1. Add the domain "localhost"
    2. Add a header, e.g. X-Authorization = test-token-123, enabled
    3. Turn the master switch on
    4. Open http://localhost:8099 and look for your header in the list.
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


class EchoHandler(BaseHTTPRequestHandler):
    def _respond(self):
        headers = {k: v for k, v in self.headers.items()}
        body = json.dumps(headers, indent=2, sort_keys=True)

        page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Header Tool echo</title>
<style>
  body {{ font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }}
  h1 {{ font-size: 1.2rem; }}
  pre {{ background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow:auto; }}
  .hit {{ color: #16a34a; font-weight: 600; }}
  .miss {{ color: #dc2626; font-weight: 600; }}
</style></head>
<body>
  <h1>Request headers received by this server</h1>
  <p>Reload after changing settings in Header Tool.</p>
  <pre>{body}</pre>
  <p>Look for your custom header above (names may appear lower-cased).</p>
</body></html>"""

        encoded = page.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        # Avoid caching so reloads always re-hit the server.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

        # Also log to the terminal for quick inspection.
        print("\n--- Request headers ---")
        print(body)

    def do_GET(self):
        self._respond()

    def do_POST(self):
        self._respond()

    def log_message(self, *args):
        pass  # silence default noisy logging


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    server = HTTPServer(("127.0.0.1", port), EchoHandler)
    print(f"Echo server running at http://localhost:{port}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
