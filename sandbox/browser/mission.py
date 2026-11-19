"""One isolated, server-scored mission."""
from pathlib import Path
import json

SCORING_VERSION = 2

SKILL_FIELDS = (
    {'From', 'Reply-To', 'Sender', 'Sender card', 'Sender domain'},
    {'Address bar', 'Link destination', 'Archive destination', 'Redeem destination', 'Workshop link', 'Shared tab'},
    {'Countdown', 'Deadline'},
    {'Role', 'Organizer', 'Approval log', 'Voice message'},
    {'Request', 'Payment', 'Form request', 'Permission', 'Scope', 'Code purpose', 'Prompt'},
    {'File name', 'File type', 'Receipt label'},
)


def skill_index(field):
    return next((index for index, fields in enumerate(SKILL_FIELDS) if field in fields), 6)


class Mission:
    def __init__(self, slug):
        self.scenes = json.loads(Path("/fixture/scenes.json").read_text())[slug]
        self.site = json.loads(Path("/fixture/sites.json").read_text())[slug]
        self.slug = slug
        self.started = False
        self.choices = []
        self.checked = False
        self.tags = set()

    def review(self):
        results = []
        for index, (choice, checked, tags) in enumerate(self.choices):
            scene = self.scenes[index]
            action = scene["actions"][choice]
            indicators = {i for i, clue in enumerate(scene["clues"]) if clue["explanation"]}
            evidence_budget = 9 if index == 2 else 8
            matched = len(tags & indicators)
            false_flags = len(tags - indicators)
            evidence_points = 0
            if checked:
                evidence_points = round(evidence_budget * max(0, matched - false_flags) / len(indicators)) if indicators else max(0, evidence_budget - 4 * false_flags)
            decision_points = action.get("points", 25 if action["safe"] else 0)
            results.append({
                "subject": scene["subject"], "action": action["label"],
                "consequence": action["consequence"], "lesson": scene["lesson"],
                "correct": action["safe"], "points": decision_points + evidence_points,
                "decisionPoints": decision_points, "evidencePoints": evidence_points,
                "clues": [
                    {**clue, "tagged": i in tags} for i, clue in enumerate(scene["clues"])
                ],
            })
        return results

    def score(self):
        if len(self.choices) < len(self.scenes):
            return {"answer": None, "correct": None, "xp": 0, "scoringVersion": SCORING_VERSION}
        results = self.review()
        skills = [[0, 0, 0] for _ in range(7)]
        for result in results:
            for clue in result['clues']:
                skill = skills[skill_index(clue['field'])]
                if clue['explanation']:
                    skill[0] += int(clue['tagged'])
                    skill[1] += 1
                else:
                    skill[2] += int(clue['tagged'])
        return {
            "answer": self.choices[-1][0],
            "correct": all(item["correct"] for item in results),
            "xp": sum(item["points"] for item in results),
            "scoringVersion": SCORING_VERSION,
            "learning": {"skills": skills, "right": sum(item['correct'] for item in results), "decisions": len(results)},
        }

    def public(self):
        step = len(self.choices)
        result = {"slug": self.slug, "step": step, "last": None, "home": self.site, **self.score()}
        if not self.started:
            return {**result, "site": self.site}
        if step:
            scene = self.scenes[step - 1]
            result["last"] = scene["actions"][self.choices[-1][0]]["consequence"]
            result["feedback"] = self.review()[-1]
        if step == len(self.scenes):
            return {**result, "scene": None, "review": self.review()}
        scene = self.scenes[step]
        public_scene = {key: scene[key] for key in ("surface", "address", "sender", "subject", "message", "check")}
        public_scene["entry"] = scene.get("entry")
        public_scene["evidence"] = scene["evidence"] if self.checked else None
        public_scene["actions"] = [item["label"] for item in scene["actions"]]
        if self.checked:
            public_scene["clues"] = [
                {"field": clue["field"], "value": clue["value"], "tagged": i in self.tags}
                for i, clue in enumerate(scene["clues"])
            ]
        return {**result, "scene": public_scene}

    def act(self, event):
        if type(event.get("stage")) is not int:
            raise ValueError("invalid stage")
        step = len(self.choices)
        if event["stage"] != step or step >= len(self.scenes):
            return self.public()
        kind, choice = event.get("kind"), event.get("action")
        if kind == "start":
            self.started = True
            return self.public()
        if not self.started:
            raise ValueError("open the site task first")
        if kind == "inspect":
            self.checked = True
        elif kind == "tag" and self.checked and type(choice) is int and 0 <= choice < len(self.scenes[step]["clues"]) and type(event.get("tagged")) is bool:
            if event["tagged"]:
                self.tags.add(choice)
            else:
                self.tags.discard(choice)
        elif kind == "act" and type(choice) is int and 0 <= choice < len(self.scenes[step]["actions"]):
            self.choices.append((choice, self.checked, self.tags))
            self.checked = False
            self.tags = set()
        else:
            raise ValueError("invalid event")
        return self.public()
