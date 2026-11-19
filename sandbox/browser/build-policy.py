"""Add only the fictional site origins shipped in the mission image."""
import json
from pathlib import Path
from urllib.parse import urlsplit

policy_path = Path("/etc/chromium/policies/managed/phish-out.json")
policy = json.loads(policy_path.read_text())
scenes = json.loads(Path("scenes.json").read_text())
sites = json.loads(Path("sites.json").read_text())
addresses = [site["address"] for site in sites.values()]
addresses += [scene["address"] for mission in scenes.values() for scene in mission]

allowed_origins = set(policy["URLAllowlist"])
for address in addresses:
    url = urlsplit(f"http://{address}")
    if not url.hostname or not url.hostname.endswith(".example") or url.netloc != url.hostname:
        raise ValueError(f"invalid mission address: {address}")
    allowed_origins.add(f"http://{url.hostname}:8080")

policy["URLAllowlist"] = sorted(allowed_origins)
policy_path.write_text(json.dumps(policy))
