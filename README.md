# Aarambathon — frontend

PHISH//OUT is a phishing awareness arcade built with Next.js, React, Tailwind,
and TypeScript.

## Local development

Start MongoDB on `127.0.0.1:27017`. For a fresh checkout, run:

```bash
pnpm install
node -e 'console.log("AUTH_SECRET=" + require("node:crypto").randomBytes(32).toString("base64url"))' >> .env.local
pnpm dev
```

Open http://localhost:3000 and use **Sign up** to create a local account. The
setup command generates the secret used to protect NextAuth sessions. Set
`AUTH_URL=http://localhost:3000` in `.env.local` when using a local production
build, or match the port you start it on. See
`.env.example` for configuration. The default database is `phish_out`.

Passwords use salted scrypt hashes. MongoDB tracks accounts, sign-ins and explicit
sign-outs, and game browser attempts with display mode, outcome and timestamps.
Close delivery is best-effort if the tab or process disappears.

The arcade and game descriptions are public. Signed-in players can play all
nine missions in disposable VM Chromium containers. Each run is owned by the
signed-in session. The Rust allocator streams Chromium video and forwards input.
The isolated fixture grades actions and MongoDB stores completed XP. See
[`sandbox/README.md`](sandbox/README.md) for deployment and the SSH tunnel.

Each current mission awards up to 100 XP. The leaderboard sums the highest
completed score per mission, shows tied totals at the same rank, and displays
pseudonyms. Earlier scoring stays in personal history.

## Learning and Gemini

My scores shows seven clue skills, practice suggestions based on missed clues,
and first-versus-latest measurements for repeated missions. The admin page
shows aggregate learning gaps once at least five players finish measured runs.
Rebuild the browser image to record evidence on new runs. Older XP stays in
the score history.

For Gemini practice drafts, create a Google AI Studio API key and set
`GEMINI_API_KEY` in `frontend/.env.local` for local development. Restart Next.js
after editing. Optionally set `GEMINI_MODEL` to a Gemini model that supports
structured output. The default is `gemini-3.8-flash`.

For the hosted frontend, set the same variables in `/etc/phish-out-frontend.env`
on the VM and recreate the frontend container with that env file. Docker reads
the file when creating the container. Keep the key server-side, outside Git
and out of the sandbox browser image.

In `/admin`, select a skill, draft a brief, and review the mission and text
before publishing. Gemini receives a skill name and the fixed mission catalog.
Published briefs point to existing sandbox missions and appear on My scores.

## AI and prediction

- **Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) powers the in-game coach (two hints per situation that never reveal the answer and don’t change XP), Riley’s live replies in Crush Switch (with a scripted fallback), and a coach report after each mission. Its skill ratings stay within one step of what you actually caught. Without a key, the coach and report say they’re unavailable and Riley uses the scripted lines.
- **Prediction** estimates which kinds of warning signs a player is likely to miss next. Set `PREDICTION_MODEL_URL` to use your own model; otherwise a built-in baseline runs. See [`model/README.md`](model/README.md) for the API, the admin training-data export, and a dependency-free reference model.

## Profiles and the QR page

Signed-in players can set a display name and upload a profile photo at `/profile` (PNG, JPEG or WebP up to 2 MB, checked by file contents). Photos are stored on the server’s disk in `UPLOAD_DIR` (default `./.data/uploads`, ignored by git) and served from `/api/avatars/<id>`. The Docker image stores them in `/data/uploads`; mount a volume there (`-v phishout-uploads:/data/uploads`) so they survive redeploys.

`/qr` shows a printable, branded QR code for https://phishout.folioo.tech, with an SVG download.

## Endless mode and the VM

- **Endless mode** (`/games/endless`) asks Gemini for a new three-email mission each time: one genuine email and two phishing, each using a different trick. The server validates every field before play: only `.example` hosts in URLs and email addresses, no real top-level domains, a safe action in each situation, and an ordinary clue in each. Generation takes about 15 seconds and is limited to once per 30 seconds per player. Runs are unranked but feed the skill predictions.
- **VM**: the sandbox VM is at `13.202.101.96`, reached through the SSH tunnel in `sandbox/deploy/com.phishout.vm-tunnel.plist`. `/api/sandbox/status` reports capacity for the live fleet panel on `/architecture`. It uses the controller’s new `/status` route (in `sandbox/src/main.rs`), and against an older controller it reports only whether `/health` answers.

## Scripts

- `pnpm dev` — development server
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint

## Sandbox capacity

The Rust allocator enforces a hard maximum of four simultaneous sandboxes.
Game guides are available under `/games`.

## Photo credits

The in-browser missions use free photos from [Unsplash](https://unsplash.com/license), downloaded through [Lorem Picsum](https://picsum.photos) and served from `public/missions/photos/`. The Unsplash License doesn’t require credit, but we list the photographers anyway. Machine-readable details are in `public/missions/photos/credits.json`.

- Dailybyte lead story: [Wojtek Witkowski](https://unsplash.com/photos/h7rOzTmGxWE)
- Dailybyte story thumbnail: [Webvilla](https://unsplash.com/photos/hv1MrBzGGNY)
- Dailybyte story thumbnail, Pizza people group avatar: [Dogancan Ozturan](https://unsplash.com/photos/94taEmdowRw)
- Dailybyte story thumbnail: [Desi Mendoza](https://unsplash.com/photos/CuSHBGBdXc0)
- Reader Perks article: [Carli Jean](https://unsplash.com/photos/UWRqlJcDCXA)
- Design workshop article: [Aleks Dorohovich](https://unsplash.com/photos/nJdwUHmaY8A)
- Member archive article: [Anders Jildén](https://unsplash.com/photos/yb0Qs65aZmc)
- Orchard Video hero: [Vadim Sherbakov](https://unsplash.com/photos/xS_RzdD5CFE)
- Orchard Video tile: [Thomas Lefebvre](https://unsplash.com/photos/aRXPJnXQ9lU)
- Orchard Video tile: [Roberto Nickson](https://unsplash.com/photos/7BjmDICVloE)
- Orchard Video tile: [Nicholas Swanson](https://unsplash.com/photos/SyBYM8R6VU4)
- Novabyte sign-in side panel: [Alejandro Escamilla](https://unsplash.com/photos/yC-Yzbqy7PY)
- Riley avatar: [Alexander Shustov](https://unsplash.com/photos/AHBiSKaENwc)
- Jordan avatar: [Matthew Wiebe](https://unsplash.com/photos/tBtuxtLvAZs)
- Avery avatar: [Olu Eletu](https://unsplash.com/photos/omKdUQ9R3Zo)
- Mira avatar: [Julia Caesar](https://unsplash.com/photos/DpoMKEARZe4)
- Fakestagram riley-1: [Alexander Shustov](https://unsplash.com/photos/2FrX56QL7P8)
- Fakestagram riley-2: [Léa Dubedout](https://unsplash.com/photos/N6STB5KbRUU)
- Fakestagram riley-3: [Charlie Foster](https://unsplash.com/photos/A88emaZe7d8)
- Fakestagram riley-4: [Stefanus Martanto Setyo Husodo](https://unsplash.com/photos/GKR1tBkmW3M)
- Fakestagram riley-5: [Roksolana Zasiadko](https://unsplash.com/photos/LyeduBb2Auk)
- Fakestagram riley-6: [Morgan Sessions](https://unsplash.com/photos/TS2UKluECVE)
- Fakestagram riley-7: [Sunset Girl](https://unsplash.com/photos/FjAD28N8-IQ)
- Fakestagram riley-8: [veeterzy](https://unsplash.com/photos/OJJIaFZOeX4)
- Fakestagram riley-9: [Julia Caesar](https://unsplash.com/photos/DpoMKEARZe4)
- Fakestagram jordan-1: [Caleb George](https://unsplash.com/photos/FmMivfgHCiM)
- Fakestagram jordan-2: [Roberto Nickson](https://unsplash.com/photos/7BjmDICVloE)
- Fakestagram jordan-3: [Joshua Earle](https://unsplash.com/photos/ZMcLVBi9xx4)
- Fakestagram jordan-4: [thomas shellberg](https://unsplash.com/photos/7gZEY7tY9C4)
- Fakestagram jordan-5: [Danka & Peter](https://unsplash.com/photos/tvicgTdh7Fg)
- Fakestagram jordan-6: [Diogo Tavares](https://unsplash.com/photos/PFZTiiJnjag)
- Fakestagram sam-1: [Benjamin Combs](https://unsplash.com/photos/hiAdjnXZxl8)
- Fakestagram sam-2: [Lechon Kirb](https://unsplash.com/photos/yvx7LSZSzeo)
- Fakestagram sam-3: [Steven Lewis](https://unsplash.com/photos/r4He4Btlsro)
- Fakestagram sam-4: [Luke Pamer](https://unsplash.com/photos/oUhr-qMTJoc)
- Fakestagram sam-5: [Daniel Robert](https://unsplash.com/photos/MRxD-J9-4ps)
- Fakestagram sam-6: [Vee O](https://unsplash.com/photos/hGO27G5tZJ8)
