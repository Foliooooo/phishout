"""Serve one bundled scenario and score its decisions outside Chromium."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock, Thread
from urllib.parse import urlsplit
import json
import os
import socketserver
from fakestagram import Fakestagram
from mission import Mission

MISSION = os.environ["PHISH_MISSION"]
ADDRESS = urlsplit("http://" + os.environ["PHISH_ADDRESS"])
FAKESTA = Fakestagram() if MISSION == "crush-switch" else None
EXERCISE = FAKESTA if FAKESTA else Mission(MISSION)
PAGE = Path("/fixture/play.html").read_bytes()
SCRIPT = Path("/fixture/play.js").read_bytes()
LOCK = Lock()


def fixture_url(address):
    parsed = urlsplit("http://" + address)
    return parsed.hostname + ":8080", parsed.path


if not FAKESTA:
    SITE_HOST, SITE_PATH = fixture_url(EXERCISE.site["address"])
    MISSION_PAGES = {(ADDRESS.netloc, ADDRESS.path), (SITE_HOST, SITE_PATH)}
    MISSION_PAGES.update(fixture_url(scene["address"]) for scene in EXERCISE.scenes)
    MISSION_HOSTS = {host for host, _ in MISSION_PAGES}


class FixtureHandler(BaseHTTPRequestHandler):
    def reply(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Security-Policy", "default-src 'none'; img-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in {"/artwork/city.jpg", "/artwork/studio.jpg", "/artwork/coffee.jpg", "/artwork/routes.jpg"}:
            self.reply((Path("/fixture") / self.path[1:]).read_bytes(), "image/jpeg")
            return
        if self.headers.get("Host") == "tabs.phishout.example:8080" and self.path == "/":
            if FAKESTA:
                links = [("Direct messages", "fakestagram.example:8080/direct/inbox"), ("Training inbox", "mail.fakestagram.example:8080/inbox")]
            else:
                links = [("Open mission", ADDRESS.netloc + ADDRESS.path), ("Open saved site", SITE_HOST + SITE_PATH + "?workspace=1")]
            items = "".join(f'<p><a href="http://{address}">{label}</a></p>' for label, address in links)
            page = '<meta charset="utf-8"><title>Sandbox tabs</title><style>body{font:20px system-ui;background:#f4ebda;color:#281d24;max-width:38rem;margin:12vh auto;padding:2rem}a{display:inline-block;padding:.7rem 1rem;background:#281d24;color:white;border-radius:1rem}</style><h1>Open a sandbox site</h1>' + items
            self.reply(page.encode(), "text/html; charset=utf-8")
            return
        if FAKESTA:
            with LOCK:
                result = FAKESTA.get(self.headers.get("Host"), urlsplit(self.path).path)
            if result:
                self.reply(*result)
            else:
                self.send_error(404)
            return
        host = self.headers.get("Host")
        if host not in MISSION_HOSTS:
            self.send_error(404)
            return
        path = urlsplit(self.path).path
        if (host, path) in MISSION_PAGES:
            if not EXERCISE.started and (host, path) != (SITE_HOST, SITE_PATH):
                self.send_response(302)
                self.send_header("Location", f"http://{SITE_HOST}{SITE_PATH}")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return
            self.reply(PAGE, "text/html; charset=utf-8")
        elif path == "/play.js":
            self.reply(SCRIPT, "text/javascript; charset=utf-8")
        elif path == "/progress":
            with LOCK:
                result = json.dumps(EXERCISE.public()).encode()
            self.reply(result, "application/json")
        else:
            self.send_error(404)

    def do_POST(self):
        host = self.headers.get("Host") or ""
        if (self.path != "/progress" or (not FAKESTA and host not in MISSION_HOSTS)
                or self.headers.get("Origin") != "http://" + host):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 128:
                raise ValueError("invalid length")
            event = json.loads(self.rfile.read(length))
            with LOCK:
                outcome = FAKESTA.act(host, event) if FAKESTA else EXERCISE.act(event)
                result = json.dumps(outcome).encode()
            self.reply(result, "application/json")
        except (ValueError, AttributeError):
            self.send_error(400)

    def log_message(self, *_):
        pass


class ControllerStatus(socketserver.StreamRequestHandler):
    def handle(self):
        with LOCK:
            result = (FAKESTA.original if FAKESTA else None) or EXERCISE.score()
            self.wfile.write(json.dumps(result).encode() + b"\n")


os.umask(0o077)
status_server = socketserver.UnixStreamServer("/bridge/mission.sock", ControllerStatus)
Thread(target=status_server.serve_forever, daemon=True).start()
ThreadingHTTPServer(("127.0.0.1", 8080), FixtureHandler).serve_forever()
