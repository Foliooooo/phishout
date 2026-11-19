"""Local Fakestagram, inbox, and lookalike pages for one disposable session."""
from pathlib import Path
import json

PLATFORM = "fakestagram.example:8080"
MAIL = "mail.fakestagram.example:8080"
LOOKALIKE = "fakestagram-session.example:8080"
PAGES = {
    (PLATFORM, "/direct/inbox"): "chat",
    (MAIL, "/inbox"): "mail",
    (LOOKALIKE, "/signup"): "signup",
}
ASSETS = {"/fakesta.css": "text/css", "/fakesta.js": "text/javascript"}
HTML = Path("/fixture/fakestagram.html").read_text()
REACTIONS = [
    "wait really? okay that’s actually cute. I was hoping you’d say something first",
    "Cedar Roof, Saturday at seven? send me a confirmation so I can book",
    "one sec, sending you the invite now!",
]


class Fakestagram:
    def __init__(self):
        self.messages = 0
        self.notice_delivered = False
        self.mail_opened = False
        self.link_opened = False
        self.dismissed = False
        self.inspected = False
        self.ending = None
        self.confirmed = False
        self.timeline = []
        self.original = None

    @property
    def trap(self):
        return self.notice_delivered

    def breakdown(self):
        return [
            {"label": "Confirmed the plan in the original session", "points": 25 if self.confirmed else 0},
            {"label": "Inspected the email link", "points": 25 if self.inspected else 0},
            {"label": "Reported through the original session", "points": 50 if self.ending == 1 else 0},
        ]

    def score(self):
        return {
            "scoringVersion": 2,
            "answer": self.ending,
            "correct": self.ending == 1 if self.ending is not None else None,
            "xp": sum(item["points"] for item in self.breakdown()),
            "messages": self.messages,
            "mailOpened": self.mail_opened,
            "linkInspected": self.inspected,
            "lookalikeOpened": self.link_opened,
            **({"learning": {"skills": [[0, 0, 0], [int(self.inspected), 1, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [int(self.confirmed), 1, 0]], "right": int(self.ending == 1), "decisions": 1}} if self.ending is not None else {}),
        }

    def public(self):
        return {**self.score(), "trap": self.trap, "confirmed": self.confirmed, "dismissed": self.dismissed, "timeline": self.timeline, "reactions": REACTIONS[:self.messages], "breakdown": self.breakdown()}

    def get(self, host, path):
        mode = PAGES.get((host, path))
        if mode:
            if mode == "signup":
                if not self.trap or not self.mail_opened:
                    return None
                self.link_opened = True
                self.record("Opened the signup link on fakestagram-session.example")
            return HTML.replace("__MODE__", mode).encode(), "text/html; charset=utf-8"
        if host in (PLATFORM, MAIL, LOOKALIKE):
            if path in ASSETS:
                return Path("/fixture" + path).read_bytes(), ASSETS[path]
            if path == "/progress":
                return json.dumps(self.public()).encode(), "application/json"
        return None

    def record(self, label):
        if label not in self.timeline:
            self.timeline.append(label)

    def act(self, host, event):
        if event.get("type") == "rewind" and self.ending == 0:
            self.original = self.original or self.score()
            self.ending = None
            self.dismissed = self.confirmed = self.inspected = self.mail_opened = self.link_opened = False
            self.timeline = ["Rewound to the session notice"]
            return self.public()
        if self.ending is not None:
            return self.public()
        kind = event.get("type")
        if host == PLATFORM and kind == "message":
            if self.messages < len(REACTIONS) and event.get("turn") == self.messages:
                self.messages += 1
        elif host == PLATFORM and kind == "trigger_training_notice" and self.messages == len(REACTIONS):
            self.notice_delivered = True
            self.record("Session notice appeared over Direct")
        elif host == MAIL and kind == "read_mail" and self.trap:
            self.mail_opened = True
            self.record("Read the recovery message")
        elif host == MAIL and kind == "inspect_link" and self.mail_opened:
            self.inspected = True
            self.record("Inspected the destination domain")
        elif host == PLATFORM and kind == "dismiss" and self.trap:
            self.dismissed = True
            self.record("Dismissed the notice")
        elif host == PLATFORM and kind == "confirm_plan" and self.dismissed:
            self.confirmed = True
            self.record("Sent a confirmation from the original account")
        elif host == PLATFORM and kind == "report" and self.dismissed and self.mail_opened:
            if self.ending is None:
                self.ending = 1
                self.record("Reported the email through the original account")
        elif host == LOOKALIKE and kind == "submit_demo" and self.link_opened:
            if self.ending is None:
                self.ending = 0
                self.record("Submitted the fixed training details")
        else:
            raise ValueError("unexpected exercise action")
        return self.public()
