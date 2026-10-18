"""
Vercel Python serverless entrypoint for GET /api/wholesale.

Uses the classic BaseHTTPRequestHandler pattern supported by Vercel’s Python runtime.
Core logic lives in wholesale_core.py (stdlib only).
"""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler

from wholesale_core import build_error_payload, build_payload, response_json


def handle_get() -> tuple[int, dict[str, str], bytes]:
    try:
        payload = build_payload()
        return response_json(payload, cache_live=True)
    except Exception as exc:  # noqa: BLE001 — surface as JSON error for the UI
        return response_json(build_error_payload(str(exc)), cache_live=False)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 — Vercel/BaseHTTPRequestHandler API
        status, headers, body = handle_get()
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        # Quieter logs on Vercel
        return
