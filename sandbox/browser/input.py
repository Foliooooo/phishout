"""Translate controller input into native X11 events on this isolated display."""
import json
import os
import socketserver
import subprocess

KEYS = {
    " ": "space", "Enter": "Return", "Backspace": "BackSpace", "Escape": "Escape",
    "Tab": "Tab", "ArrowUp": "Up", "ArrowDown": "Down", "ArrowLeft": "Left",
    "ArrowRight": "Right", "Delete": "Delete", "Home": "Home", "End": "End",
    "PageUp": "Prior", "PageDown": "Next", ".": "period", "/": "slash",
    ":": "colon", "-": "minus", "_": "underscore", "?": "question",
    "=": "equal", "&": "ampersand", ",": "comma", "!": "exclam",
    "'": "apostrophe", '"': "quotedbl", "@": "at", "(": "parenleft", ")": "parenright",
}


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        try:
            event = json.loads(self.rfile.readline(512))
            kind = event["type"]
            command = ["xdotool"]
            if kind in ("move", "click", "wheel"):
                command += ["mousemove", str(event["x"]), str(event["y"])]
            if kind == "click":
                command += ["click", "1"]
            elif kind == "wheel":
                delta = event["delta"]
                command += ["click", "--delay", "12", "--repeat", str(min(8, max(1, abs(delta) // 80))), "5" if delta > 0 else "4"]
            elif kind == "key":
                key = event["key"]
                symbol = KEYS.get(key)
                if symbol is None and len(key) == 1 and key.isascii() and key.isalnum():
                    symbol = key
                if symbol is None:
                    raise ValueError("unsupported key")
                modifiers = []
                if event.get("ctrl"):
                    modifiers.append("ctrl")
                if event.get("alt"):
                    modifiers.append("alt")
                if event.get("shift") and len(key) != 1:
                    modifiers.append("shift")
                command += ["key", "--clearmodifiers", "+".join([*modifiers, symbol])]
            elif kind != "move":
                raise ValueError("unsupported event")

            subprocess.run(command, check=True, timeout=2, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.wfile.write(b"ok\n")
        except (KeyError, ValueError, subprocess.SubprocessError):
            self.wfile.write(b"error\n")


os.umask(0o077)
with socketserver.UnixStreamServer("/bridge/input.sock", Handler) as server:
    server.serve_forever()
