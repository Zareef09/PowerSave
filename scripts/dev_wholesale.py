#!/usr/bin/env python3
"""Local stdlib HTTP server that serves the same wholesale handler as Vercel."""

from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from wholesale import handle_get  # noqa: E402


class DevHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path not in ("/api/wholesale", "/api/wholesale.py", "/"):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"not found"}')
            return
        status, headers, body = handle_get()
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


def main() -> None:
    host = "127.0.0.1"
    port = 8001
    server = ThreadingHTTPServer((host, port), DevHandler)
    print(f"PowerSave wholesale API (local) http://{host}:{port}/api/wholesale", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local wholesale API", flush=True)


if __name__ == "__main__":
    main()
