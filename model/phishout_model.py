"""Reference prediction model for PHISH//OUT (standard library only).

Predicts, for each of the seven skills, the chance a player misses a warning
sign of that kind in their next run. One small logistic regression per skill,
trained on the JSON Lines export from /api/admin/training-data.

Replace this with your own model whenever you like: anything that answers
POST /predict with the same JSON shape works (see README.md).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

SKILLS = ["Sender", "Links", "Urgency", "Authority", "Requests", "Attachments", "Trust"]
WEIGHTS = Path(__file__).with_name("weights.json")


def skill_vector(features: dict, index: int) -> list[float]:
    """Inputs for one skill: bias, all-time miss rate, recent miss rate, experience, decisions, caution."""
    skill = features["skills"][index]
    available = skill["available"]
    all_time = (available - skill["found"] + 1) / (available + 2)
    recent = skill["recentMissRate"] if skill["recentMissRate"] is not None else all_time
    accuracy = features["decisionAccuracy"] if features["decisionAccuracy"] is not None else 0.5
    false_flags = features["falseFlagRate"] if features["falseFlagRate"] is not None else 0.0
    days = features["daysSinceLastRun"] if features["daysSinceLastRun"] is not None else 0
    return [1.0, all_time, recent, math.log1p(available), accuracy, false_flags, min(days, 60) / 60]


def sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-max(-30.0, min(30.0, value))))


def train(path: Path, epochs: int = 400, rate: float = 0.3, l2: float = 0.01) -> dict:
    examples = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    weights = {}
    for index, name in enumerate(SKILLS):
        rows = []
        for example in examples:
            label = example["label"]["skills"][index]
            if label["available"]:
                rows.append((skill_vector(example["features"], index), label["missed"], label["available"]))
        w = [0.0] * 7
        if rows:
            total = sum(available for _, _, available in rows)
            for _ in range(epochs):
                gradient = [0.0] * len(w)
                for x, missed, available in rows:
                    p = sigmoid(sum(a * b for a, b in zip(w, x)))
                    # Binomial log-loss: `missed` failures out of `available` clues.
                    error = p * available - missed
                    for k, value in enumerate(x):
                        gradient[k] += error * value
                w = [wk - rate * (g / total + l2 * wk * (k > 0)) for k, (wk, g) in enumerate(zip(w, gradient))]
        weights[name] = {"w": w, "examples": len(rows)}
    WEIGHTS.write_text(json.dumps(weights, indent=2))
    return weights


def load_weights() -> dict | None:
    return json.loads(WEIGHTS.read_text()) if WEIGHTS.exists() else None


MISSIONS = {
    "Sender": "inbox-trap", "Links": "link-inspector", "Urgency": "tick-tock", "Authority": "whos-the-boss",
    "Requests": "popup-panic", "Attachments": "download-roulette", "Trust": "crush-switch",
}


def predict(features: dict, weights: dict | None) -> dict:
    skills = []
    for index, name in enumerate(SKILLS):
        x = skill_vector(features, index)
        trained = weights and weights.get(name, {}).get("examples", 0) >= 5
        miss = sigmoid(sum(a * b for a, b in zip(weights[name]["w"], x))) if trained else (x[1] + 2 * x[2]) / 3
        available = features["skills"][index]["available"]
        confidence = "high" if available >= 8 else "medium" if available >= 3 else "low"
        skills.append({"missChance": round(miss, 3), "confidence": confidence})
    accuracy = features["decisionAccuracy"] if features["decisionAccuracy"] is not None else 0.5
    clue_miss = sum(item["missChance"] for item in skills) / len(skills)
    risk = round(100 * (0.6 * (1 - accuracy) + 0.4 * clue_miss))
    worst = max(range(len(SKILLS)), key=lambda i: skills[i]["missChance"])
    return {"risk": risk, "skills": skills, "next": MISSIONS[SKILLS[worst]], "model": "trained" if weights else "untrained"}
