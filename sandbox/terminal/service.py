"""PHISH//OUT terminal sandbox service (Python 3 standard library only).

One real, interactive shell per player, for the terminal forensics missions.

Runtimes (TERMINAL_RUNTIME):
  docker  (default, for the VM) - `docker run` a throwaway container per
          session: no network, read-only root, all capabilities dropped,
          no-new-privileges, memory/CPU/PID limits, removed on close.
  local   (development only)    - a bash shell in a temporary folder holding
          the case files. This is a real shell on the host, so it only starts
          when TERMINAL_RUNTIME=local is set explicitly. Never use it on a
          shared machine.

HTTP API on 127.0.0.1:8788 (same bearer secret as the Rust controller,
owner passed in X-Sandbox-Owner, like the browser sandbox):
  GET    /health
  GET    /status                       capacity, no owners
  POST   /sessions          {id, case} start a shell
  GET    /sessions/{id}?since=N        long-poll output after byte N (≤ 20 s)
  POST   /sessions/{id}     {data} | {cols, rows}   keystrokes or resize
  DELETE /sessions/{id}
"""

from __future__ import annotations

import base64
import fcntl
import hmac
import json
import os
import pty
import re
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import termios
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_SESSIONS = 4
IDLE_SECONDS = 5 * 60
LIFETIME_SECONDS = 20 * 60
BUFFER_LIMIT = 512 * 1024
CASES = {"header-hunt", "payload-autopsy"}
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

SECRET = os.environ.get("SANDBOX_SECRET", "")
RUNTIME = os.environ.get("TERMINAL_RUNTIME", "docker")
IMAGE = os.environ.get("TERMINAL_IMAGE", "phish-out-terminal:local")
HERE = Path(__file__).resolve().parent
LABEL = "io.phishout.terminal=1"


class Session:
    def __init__(self, sid: str, owner: str, case: str):
        self.id, self.owner, self.case = sid, owner, case
        self.created = self.seen = time.monotonic()
        self.output = bytearray()
        self.offset = 0  # bytes dropped from the front of the buffer
        self.alive = True
        self.cond = threading.Condition()
        self.workdir: str | None = None

        pid, fd = pty.fork()
        if pid == 0:  # child
            try:
                if RUNTIME == "local":
                    self._exec_local()
                else:
                    self._exec_docker()
            finally:
                os._exit(1)
        self.pid, self.fd = pid, fd
        self.resize(100, 30)
        threading.Thread(target=self._pump, daemon=True).start()

    # -- child side ---------------------------------------------------------
    def _exec_docker(self) -> None:
        os.execvp("docker", [
            "docker", "run", "--rm", "-it",
            "--name", f"phish-out-term-{self.id}", "--label", LABEL,
            "--network", "none", "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
            "--tmpfs", "/home/analyst:rw,nosuid,size=16m,uid=1000,gid=1000",
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
            "--pids-limit", "64", "--memory", "128m", "--cpus", "0.5",
            "--user", "1000:1000", "--workdir", f"/case/{self.case}",
            "--env", f"PHISHOUT_CASE={self.case}", "--hostname", "forensics",
            IMAGE,
        ])

    def _exec_local(self) -> None:
        workdir = tempfile.mkdtemp(prefix="phishout-case-")
        subprocess.run([sys.executable, str(HERE / "build_cases.py"), workdir], check=True, stdout=subprocess.DEVNULL)
        rc = Path(workdir) / ".phishoutrc"
        rc.write_text((HERE / "bashrc").read_text().replace("/case/", f"{workdir}/"))
        env = {
            "HOME": workdir, "PATH": "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin",
            "TERM": "xterm-256color", "PHISHOUT_CASE": self.case, "BASH_SILENCE_DEPRECATION_WARNING": "1",
        }
        os.chdir(Path(workdir) / self.case)
        os.execvpe("bash", ["bash", "--noprofile", "--rcfile", str(rc), "-i"], env)

    # -- parent side --------------------------------------------------------
    def _pump(self) -> None:
        while True:
            try:
                chunk = os.read(self.fd, 4096)
            except OSError:
                chunk = b""
            if not chunk:
                break
            with self.cond:
                self.output += chunk
                overflow = len(self.output) - BUFFER_LIMIT
                if overflow > 0:
                    del self.output[:overflow]
                    self.offset += overflow
                self.cond.notify_all()
        with self.cond:
            self.alive = False
            self.cond.notify_all()

    def read(self, since: int, wait: float) -> tuple[bytes, int, bool]:
        deadline = time.monotonic() + wait
        with self.cond:
            while self.alive and self.offset + len(self.output) <= since:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                self.cond.wait(remaining)
            start = max(0, since - self.offset)
            data = bytes(self.output[start:])
            return data, self.offset + len(self.output), self.alive

    def write(self, data: bytes) -> None:
        self.seen = time.monotonic()
        if self.alive:
            os.write(self.fd, data)

    def resize(self, cols: int, rows: int) -> None:
        cols, rows = max(20, min(cols, 300)), max(5, min(rows, 120))
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    def close(self) -> None:
        if RUNTIME == "docker":
            subprocess.run(["docker", "rm", "-f", f"phish-out-term-{self.id}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            os.kill(self.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            os.waitpid(self.pid, 0)
        except ChildProcessError:
            pass
        try:
            os.close(self.fd)
        except OSError:
            pass
        with self.cond:
            self.alive = False
            self.cond.notify_all()


sessions: dict[str, Session] = {}
lock = threading.Lock()


def reaper() -> None:
    while True:
        time.sleep(15)
        now = time.monotonic()
        with lock:
            expired = [s for s in sessions.values()
                       if not s.alive or now - s.seen > IDLE_SECONDS or now - s.created > LIFETIME_SECONDS]
            for session in expired:
                sessions.pop(session.id, None)
        for session in expired:
            session.close()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: dict | None = None) -> None:
        data = json.dumps(body).encode() if body is not None else b""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _authorized(self) -> bool:
        header = self.headers.get("Authorization", "")
        return bool(SECRET) and header.startswith("Bearer ") and hmac.compare_digest(header[7:].encode(), SECRET.encode())

    def _owner(self) -> str | None:
        owner = self.headers.get("X-Sandbox-Owner", "")
        return owner if 0 < len(owner) <= 128 else None

    def _session(self, sid: str) -> Session | None:
        owner = self._owner()
        with lock:
            session = sessions.get(sid)
        return session if session and session.owner == owner else None

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length > 16_384:
            raise ValueError("too large")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self) -> None:  # noqa: N802
        path, _, query = self.path.partition("?")
        if path == "/health":
            return self._send(200, {"ok": True, "runtime": RUNTIME})
        if not self._authorized():
            return self._send(401)
        if path == "/status":
            with lock:
                live = [s for s in sessions.values() if s.alive]
                body = {"max": MAX_SESSIONS, "active": len(live),
                        "sessions": [{"case": s.case, "ageSeconds": int(time.monotonic() - s.created)} for s in live]}
            return self._send(200, body)
        match = re.fullmatch(r"/sessions/([0-9a-f-]{36})", path)
        if not match:
            return self._send(404)
        session = self._session(match.group(1))
        if not session:
            return self._send(404)
        since = 0
        for part in query.split("&"):
            if part.startswith("since="):
                since = int(part[6:] or 0) if part[6:].isdigit() else 0
        session.seen = time.monotonic()
        data, cursor, alive = session.read(since, 20.0)
        self._send(200, {"data": base64.b64encode(data).decode(), "next": cursor, "alive": alive})

    def do_POST(self) -> None:  # noqa: N802
        if not self._authorized():
            return self._send(401)
        owner = self._owner()
        if not owner:
            return self._send(400, {"error": "missing owner"})
        try:
            body = self._body()
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"error": "bad body"})

        if self.path == "/sessions":
            sid, case = body.get("id"), body.get("case")
            if not isinstance(sid, str) or not UUID.match(sid) or case not in CASES:
                return self._send(400, {"error": "bad session"})
            with lock:
                existing = sessions.get(sid)
                if existing:
                    return self._send(200 if existing.owner == owner and existing.alive else 409)
                if any(s.owner == owner and s.alive for s in sessions.values()):
                    return self._send(409, {"error": "close your other terminal first"})
                if sum(s.alive for s in sessions.values()) >= MAX_SESSIONS:
                    return self._send(429, {"error": "all terminals are busy"})
                try:
                    sessions[sid] = Session(sid, owner, case)
                except OSError as error:
                    return self._send(503, {"error": str(error)})
            return self._send(201)

        match = re.fullmatch(r"/sessions/([0-9a-f-]{36})", self.path)
        session = self._session(match.group(1)) if match else None
        if not session:
            return self._send(404)
        if isinstance(body.get("cols"), int) and isinstance(body.get("rows"), int):
            session.resize(body["cols"], body["rows"])
        data = body.get("data")
        if isinstance(data, str) and data:
            session.write(data.encode()[:4096])
        self._send(204)

    def do_DELETE(self) -> None:  # noqa: N802
        if not self._authorized():
            return self._send(401)
        match = re.fullmatch(r"/sessions/([0-9a-f-]{36})", self.path)
        session = self._session(match.group(1)) if match else None
        if not session:
            return self._send(404)
        with lock:
            sessions.pop(session.id, None)
        session.close()
        self._send(204)

    def log_message(self, *args) -> None:  # quiet
        pass


def main() -> None:
    if not SECRET:
        sys.exit("Set SANDBOX_SECRET (the same value the app and Rust controller use).")
    if RUNTIME not in {"docker", "local"}:
        sys.exit("TERMINAL_RUNTIME must be docker or local.")
    if RUNTIME == "docker":
        if not shutil.which("docker"):
            sys.exit("docker not found; use TERMINAL_RUNTIME=local only for development.")
        # Remove terminals left over from a previous run.
        leftovers = subprocess.run(["docker", "ps", "-aq", "--filter", f"label={LABEL}"], capture_output=True, text=True).stdout.split()
        if leftovers:
            subprocess.run(["docker", "rm", "-f", *leftovers], stdout=subprocess.DEVNULL)
    else:
        print("WARNING: local runtime gives each session a real shell on this machine. Development only.", file=sys.stderr)
    threading.Thread(target=reaper, daemon=True).start()
    port = int(os.environ.get("TERMINAL_PORT", "8788"))
    print(f"PHISH//OUT terminal service on 127.0.0.1:{port} ({RUNTIME})")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
