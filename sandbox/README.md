# PHISH OUT sandbox service

The Ubuntu VM runs the Next.js web app, MongoDB, and the Rust/Axum sandbox
controller. NextAuth supplies the owner for every launch, video, and input
request. MongoDB keeps mission results. Total XP adds up each player's best
score per mission, so repeating a mission cannot inflate the total.

The controller allocates up to six disposable Chromium containers, with one
per authenticated app session. Each launches the real Chromium window in an
isolated X11 display. FFmpeg encodes that full display as a continuous 720p
H.264 stream at a target of 15 fps. The viewer plays fragmented MP4 through
Media Source Extensions and forwards input to the remote window. No frame
polling is used.

Containers have loopback networking only. Bundled fixture URLs are
allowlisted, browser DevTools and downloads are disabled, and each session has
a fresh profile. The fixture server owns the score and hands it to Rust over a
private Unix socket. Browser input and video use separate private sockets.
The browser runs as nonroot with dropped capabilities, no new privileges,
a read-only root filesystem, and bounded processes, memory, and CPU.
Chromium's internal sandbox is disabled in this container setup, which
only serves bundled training content. The stream provides pixels and native
keyboard and pointer input, with no remote accessibility tree for assistive
technology. Address typing currently requires a physical keyboard.

The container is removed on close, after 90 seconds without viewer activity,
or after 12 minutes. Old managed containers are removed at controller startup.

## VM installation

Install Docker and a Rust toolchain on the Ubuntu host. Build the image and
controller from this directory:

```sh
sudo docker build -t phish-out-browser:local browser
cargo build --locked --release
sudo install -D -m 755 target/release/phish-out-sandbox /opt/phish-out/phish-out-sandbox
sudo install -m 644 deploy/phish-out-sandbox.service /etc/systemd/system/phish-out-sandbox.service
sudo systemctl daemon-reload
```

Write a random 32-byte hex value as `SANDBOX_SECRET` in a root-readable-only
`/etc/phish-out-sandbox.env`. Then run
`sudo systemctl enable --now phish-out-sandbox` and check
`curl http://127.0.0.1:8787/health` on the VM. The unit assumes the Ubuntu AMI's
`ubuntu` user has UID 1000 and uses the Docker group in the service only.

## VM frontend and email

The production frontend image builds from the root Dockerfile. The VM binds
Next.js to loopback port 3100, the Rust controller to 8787, and MongoDB to
27017. The local app is reachable over SSH:

```sh
ssh -NT -L 127.0.0.1:3100:127.0.0.1:3100 -i /path/to/key.pem ubuntu@VM_IP
```

Then open http://localhost:3100. If hosting publicly later, use a TLS reverse
proxy and set AUTH_URL to its HTTPS origin. Keep controller and database ports
private.

MongoDB stores its data in a persistent Docker volume and the app uses a
database-scoped read/write user. The VM uses root-readable-only environment
files for the app, MongoDB setup, and sandbox controller. Refer to
`.env.example` in the frontend for variable names.

Auth mail uses the configured SMTP provider over STARTTLS or TLS. New users
must verify ownership with an eight-digit email code. The reset flow uses
a separate email code and invalidates existing sessions after a password
change. Codes expire in ten minutes and are stored as keyed hashes. Accounts
created before verification was introduced retain access.

## Admin and training mailbox

Open `/admin` and use the verified PHISH//OUT account password for
`harshit@folioo.tech`. The same SMTP transport delivers an eight-digit second
factor. Codes expire after ten minutes and are consumed on use. The admin
session expires after thirty minutes and stops working after a password change.

The admin page links to the EC2 console and a Chrome desktop for the mailbox
owner. The desktop runs under the separate `phish-mail` Linux account. Install
TigerVNC, Openbox, and Google Chrome on the VM, create the locked account and
its private home at `/var/lib/phish-mail`, then install
`deploy/phish-out-mail-desktop` to `/usr/local/libexec` and
`deploy/phish-out-mail-desktop.service` to `/etc/systemd/system`. Set a private
VNC password file at `/var/lib/phish-mail/vnc.passwd` before enabling the unit.
The admin page shows the tunnel and password retrieval commands used by this
VM. VNC listens on loopback and requires both SSH access and VNC authentication.

The Gmail session belongs to this admin desktop. Inbox Trap and Fakestagram
use bundled training mail. A player-facing Gmail integration would need
dedicated exercise accounts and separate profiles per seat.

## Practice sites and evidence

The eight non-chat missions open a fictional site with working local search
and browsable records. The player's task opens a staged item. Chromium loads
its actual fictional address, and the saved-site link lets the player return
to the original context. The fixture serves only the pages for that mission
and the browser image validates the address list at build time.

The fixture hides clue explanations until the debrief and scores evidence
tags separately from decisions. False flags reduce evidence credit. My Scores
suggests a mission based on the player's lowest completed best score.

## Fakestagram (Crush Switch)

Crush Switch runs inside the disposable Chromium window. After the third
reply, the bundled extension overlays a simulated logout on the still
signed-in DM page and delivers a message to the practice inbox. The inbox
and lookalike open in separate tabs with fictional addresses.

The extension runs on Fakestagram Direct only. Chat text stays in the tab's
session storage and the fixture receives only turn numbers and exercise
actions. The lookalike accepts fixed practice values. The fixture commits
the first completed outcome and returns XP to the controller. MongoDB
records the score in My Scores and the leaderboard.

On macOS, `deploy/com.phishout.vm-tunnel.plist` keeps the hosted frontend,
development controller, and private desktop forwards connected. Replace the
two placeholders with the local key's absolute path and the SSH login. Use a
mode-600 key in the user's SSH directory and verify the host key before
loading the file into the user's LaunchAgents.

## Terminal forensics service

`terminal/` runs the VM-only terminal missions (Header Hunt, Payload Autopsy):
a real bash shell per player in a disposable container with `--network none`,
a read-only root and case folder, all capabilities dropped,
`no-new-privileges`, and limits of 64 processes, 128 MB memory and half a CPU.
It allows six shells at once and one per app session. Shells close after
5 idle minutes or 20 minutes in total, and leftovers are removed on restart.
Answers are graded by the web app, never inside the container.

```sh
sudo docker build -t phish-out-terminal:local terminal
sudo install -D -m 644 terminal/service.py /opt/phish-out/terminal/service.py
sudo install -m 644 terminal/phish-out-terminal.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now phish-out-terminal
curl http://127.0.0.1:8788/health
```

The service reads `SANDBOX_SECRET` from `/etc/phish-out-sandbox.env` and
listens on loopback port 8788. Point the app at it with
`TERMINAL_URL=http://127.0.0.1:8788` and forward the port in the SSH tunnel
for local development against the VM.

For local development without Docker, `TERMINAL_RUNTIME=local
SANDBOX_SECRET=… python3 sandbox/terminal/service.py` gives each session a bash
shell in a temporary folder. That is a real shell on your machine, so use it
only on your own computer and stop it afterwards.
