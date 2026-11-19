"""Train the reference model from the admin export.

    # Sign in at /admin, then download /api/admin/training-data
    python3 model/train.py phishout-training.jsonl

Writes model/weights.json, which serve.py loads on start.
"""

import sys
from pathlib import Path

from phishout_model import SKILLS, train

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 model/train.py <training.jsonl>")
    weights = train(Path(sys.argv[1]))
    for name in SKILLS:
        print(f"{name:12} {weights[name]['examples']:5} examples")
    print("Saved model/weights.json")
