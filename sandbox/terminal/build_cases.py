"""Builds the forensics case files baked into the terminal image.

Everything is fictional: made-up organisations on reserved .example domains.
The "malicious" files are inert text/zip fixtures; nothing here executes.
Run with an output directory: python3 build_cases.py /case
"""

import base64
import hashlib
import sys
import zipfile
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "case")

# --- Header Hunt -------------------------------------------------------------
hunt = root / "header-hunt" / "inbox"
hunt.mkdir(parents=True, exist_ok=True)

(hunt / "payroll.eml").write_text("""Return-Path: <bounce@payfast-mailer.example>
Received: from relay.payfast-mailer.example (198.51.100.23)
Authentication-Results: mx.novabyte.example; spf=fail smtp.mailfrom=payfast-mailer.example; dkim=none
From: "Novabyte Payroll" <payroll@novabyte.example>
Reply-To: payroll-desk@payfast-help.example
To: sam@novabyte.example
Subject: Action needed: confirm your bank details before Friday's run
Date: Thu, 19 Nov 2026 08:41:07 +0530
Message-ID: <77f1c2a9@relay.payfast-mailer.example>
Content-Type: text/plain; charset=utf-8

Hi Sam,

We could not process your salary details for this month. Reply with your
bank account and sort code before Friday or your payment will be delayed.

Novabyte Payroll
""")

(hunt / "it-ticket.eml").write_text("""Return-Path: <servicedesk@novabyte.example>
Received: from mail.novabyte.example (192.0.2.10)
Authentication-Results: mx.novabyte.example; spf=pass smtp.mailfrom=novabyte.example; dkim=pass header.d=novabyte.example
From: "Novabyte Service Desk" <servicedesk@novabyte.example>
To: sam@novabyte.example
Subject: NB-2041 resolved: calendar sync
Date: Thu, 19 Nov 2026 09:12:44 +0530
Message-ID: <nb-2041.4471@mail.novabyte.example>
Content-Type: text/plain; charset=utf-8

Your ticket NB-2041 has been resolved. No action is needed.
You can see the full history in the service desk portal from your bookmarks.
""")

html = """<html><body>
<p>Mira shared a document with you: <b>Q4 budget (final)</b></p>
<p><a href="https://novabyte-docs.share-view.example/open?doc=Q4-final">View document on docs.novabyte.example</a></p>
</body></html>"""
encoded = base64.encodebytes(html.encode()).decode()
(hunt / "shared-doc.eml").write_text(f"""Return-Path: <notify@share-view.example>
Received: from out.share-view.example (203.0.113.77)
Authentication-Results: mx.novabyte.example; spf=pass smtp.mailfrom=share-view.example; dkim=pass header.d=share-view.example
From: "Mira (via Docs)" <notify@share-view.example>
To: sam@novabyte.example
Subject: Mira shared "Q4 budget (final)" with you
Date: Thu, 19 Nov 2026 10:03:19 +0530
Message-ID: <a81e0c@out.share-view.example>
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: base64

{encoded}""")

# --- Payload Autopsy ---------------------------------------------------------
dl = root / "payload-autopsy" / "downloads"
dl.mkdir(parents=True, exist_ok=True)

(dl / "invoice.pdf").write_text("""#!/bin/sh
# TRAINING FIXTURE: inert. This file only pretends to be a PDF.
# A real dropper would fetch a second stage from the address below.
STAGE2="https://cdn-update.example/get/stage2.bin"
echo "this is a harmless training sample"
""")

with zipfile.ZipFile(dl / "report.xlsm", "w") as book:
    book.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
    book.writestr("xl/workbook.xml", '<?xml version="1.0"?><workbook/>')
    book.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><worksheet/>')
    book.writestr("xl/vbaProject.bin", b"TRAINING FIXTURE: inert macro placeholder. AutoOpen -> Shell(powershell ...)")

(dl / "resume.pdf").write_bytes(
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF\n"
)

digest = hashlib.sha256((dl / "report.xlsm").read_bytes()).hexdigest()
(root / "payload-autopsy" / "blocklist.txt").write_text(
    "# SHA-256 hashes reported by the security team this week\n"
    "3f0c2b1d9a8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a\n"
    f"{digest}\n"
    "9a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9\n"
)

for case, intro in {
    "header-hunt": "Three emails landed in inbox/. Investigate their raw headers and bodies.",
    "payload-autopsy": "Three files arrived in downloads/. Find out what they really are. Don't run them.",
}.items():
    (root / case / "README.txt").write_text(
        f"PHISH//OUT forensics case: {case}\n\n{intro}\n"
        "Answer the questions in the case panel on the right.\n"
        "Useful tools: ls, cat, less, grep, head, file, unzip -l, strings, sha256sum, base64 -d\n"
    )
print(f"cases written to {root}")
