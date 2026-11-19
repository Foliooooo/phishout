"""Serve the reference model: POST /predict, GET /health.

    python3 model/serve.py --port 8790
    # then in .env.local:  PREDICTION_MODEL_URL=http://127.0.0.1:8790/predict

Optional: set PREDICTION_MODEL_TOKEN to require "Authorization: Bearer <token>".
"""

from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from phishout_model import load_weights, predict

TOKEN = os.environ.get("PREDICTION_MODEL_TOKEN", "")
WEIGHTS = load_weights()


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send(200, {"ok": True, "trained": WEIGHTS is not None})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/predict":
            return self._send(404, {"error": "not found"})
        if TOKEN and self.headers.get("Authorization") != f"Bearer {TOKEN}":
            return self._send(401, {"error": "unauthorized"})
        length = int(self.headers.get("Content-Length", "0"))
        if length > 100_000:
            return self._send(413, {"error": "too large"})
        try:
            features = json.loads(self.rfile.read(length))
            if features.get("version") != 1 or len(features.get("skills", [])) != 7:
                raise ValueError("unsupported feature version")
            self._send(200, predict(features, WEIGHTS))
        except (ValueError, KeyError, TypeError) as error:
            self._send(400, {"error": str(error)})

    def log_message(self, format: str, *args) -> None:  # quieter logs
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args()
    print(f"PHISH//OUT model on http://{args.host}:{args.port}/predict ({'trained' if WEIGHTS else 'untrained baseline'})")
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
