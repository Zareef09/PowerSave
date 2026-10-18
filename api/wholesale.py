"""
Vercel Python serverless entrypoint for GET /api/wholesale.

Uses the classic BaseHTTPRequestHandler pattern supported by Vercel’s Python runtime.
Shared logic lives in the project-root package `wholesale_core` (not under api/, so it
is not deployed as its own public endpoint). Import-time code here is side-effect free.
"""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler

from wholesale_core import handle_get


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
