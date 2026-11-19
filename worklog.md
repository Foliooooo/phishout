# PHISH//OUT worklog

## 2026-11-17

- Reviewed the arcade, game routes, theme tokens, shared controls, and the repository's PHISH OUT UI skill. The game catalog points to fictional domains and the VM allocator/stream service is absent.
- UI checklist: retain the single navbar and footer, reuse the team credit, Button, Scales, and ScrollReveal, use both token themes, and keep browser controls inside the game stage. Keep the arcade public and gate the full-screen browser behind Clerk.
- Provisioned an unclaimed Clerk development instance using the official CLI. Development keys are in the ignored `.env.local`.
- Replaced the initial Clerk integration at the user's direction. Removed the SDK, provider, and routes, and replaced the local Clerk environment with an Auth.js secret. Added custom NextAuth credential forms and MongoDB account storage with salted scrypt hashes.
- Added authentication and game browser activity tracking. The fullscreen stage has an honest unavailable state while the VM allocator is pending.
- Rebalanced the navbar with in-flow spacing above and below, centered desktop links, and grouped account actions. Used the user's drawn curve for the full-width footer edge and retained the translucent wordmark.
- Locked background scroll behind the team sheet and constrained its content to the dynamic viewport so the close action stays reachable on short screens.
- Verified in a local production build with Chrome: signed-out launch gating and API 401, account creation with return to the selected game, rejected incorrect password, successful sign-in and sign-out, native fullscreen open and close, and responsive layout down to 320px. Checked light and dark themes and the team sheet in short landscape.
- Confirmed MongoDB persisted two signed-out sessions and an unavailable browser attempt with both timestamps for the QA account. MongoDB runs locally on loopback. The VM stream and in-sandbox activity remain pending.
- Passed ESLint, TypeScript, and the Next.js production build.

- Removed the navbar squiggle and its CSS. Rebuilt sign-in and sign-up as responsive, viewport-height layouts with the form first on narrow screens. Reused the existing NextAuth actions, field validation, and game return links.
- Exported and used “Bring Solutions to Problems” and “Digital Customer Service Call Center” from [Streamline’s New York illustration collection on Figma](https://www.figma.com/design/wearFo75r7sRLqg9hYqD5y/510-Abstract-Illustrations-%E2%80%93-New-York-vector-illustrations-set--svg-png---Community-?node-id=1140-7896). The original vectors are served locally.
- Checked the redesigned sign-in in dark mode and sign-up in light mode in Chrome. Independent review confirmed the form-first layout on narrow screens and identified the need for stronger input well contrast, which was updated to the paper-deep token. Added a Streamline credit link on both screens. ESLint, TypeScript, production build, and diff checks passed.

- Enlarged the account illustrations and filled the panel with the shared Scales texture and layered pink shapes. Added Pikaicons eye controls to both forms and a five-level, browser-only zxcvbn strength meter to sign-up. The meter gives feedback alongside the existing password requirements.
- Verified keyboard reveal and hide, preserved input during toggling, weak and strong meter results, meter reset on clearing, and no horizontal overflow at 320px in Chrome. Reviewed the dark desktop panel. ESLint, TypeScript, production build, and diff checks passed.

- Recommended a starting sandbox host of 8 vCPU, 32 GiB RAM, and 100 GB SSD for ten simultaneous lightweight Chromium sessions. Capacity remains an estimate until the real streaming stack is tested with ten active players.

- Added Next.js Proxy for the guest-only sign-in/sign-up routes, plus an authenticated submission guard. Both use the same validated game destination and fall back to the Games hub.
- Added the public Games hub and individual objectives, three-step play guides, and fictional starting addresses for all eight missions. Updated the navigation, footer, and hero links.
- Revised the planned sandbox concurrency from ten to six. The VM allocator remains unwired, so its future enforcement is documented in README.md.
- Verified in Chrome at 320px that all eight guides load, sign-up returns to the selected mission, signed-in requests to both auth pages redirect, external return URLs fall back to the hub, and sign-out restores guest access. ESLint, TypeScript, production build, and diff checks passed.

- Revised the six-sandbox pilot VM recommendation to AWS m7a.xlarge (4 vCPU, 16 GiB RAM), with an 80 GB gp3 volume. Keep m7a.2xlarge as the fallback if six active streams saturate CPU or make input lag.

- Where M7a is unavailable, recommended C6i.2xlarge (8 vCPUs, 16 GiB RAM) for six CPU-streamed browser sandboxes. Consider G6f only if the streaming stack uses hardware encoding.

- Revised the AWS shortlist to the available families. Start with m8a.xlarge (4 vCPUs, 16 GiB RAM), with m8a.2xlarge as the fallback if six active streams cause sustained CPU pressure or input lag.

### Rust sandbox pilot

- Connected to the Ubuntu EC2 host and restricted the supplied SSH key's local permissions. Installed Docker and the Rust toolchain. Added the Rust/Axum controller, isolated Chromium image, fictional mission fixtures, systemd service, and setup instructions under `sandbox/`.
- Enforced six concurrent containers and one per authenticated app session. Each browser uses a private Unix socket, no container network, bounded resources, and a disposable profile. Added explicit close, idle/lifetime expiry, and restart cleanup.
- Connected the existing fullscreen browser to the service over a loopback-only SSH tunnel. NextAuth gates launch, frames, and inputs. MongoDB records attempts, completion, XP, and the final structured mission activity on close.
- Verified six concurrent sessions and rejection of a seventh, JPEG delivery and owner isolation. In a signed-in Chrome session, opened the remote browser, clicked an answer, and closed it. Confirmed MongoDB recorded the correct answer, 100 XP, and a close timestamp. The VM has no public controller port.
- Built the locked Rust release and deployed it as an enabled systemd service. Final 12-second direct load test delivered about 70 frames per session to six sessions concurrently and verified keyboard completion. Launched the other two mission fixtures separately. This is a pilot smoke test, with the frontend and database still local and the stream around 6 fps under the tested load.
- Verified the frontend with ESLint, TypeScript, and the Next.js production build. Added a keyboard hint to the fullscreen stage and removed decorative buttons that looked interactive.

### VM-hosted frontend, account mail, and browser video

- Migrated a snapshot of the local PHISH OUT MongoDB database to an authenticated, persistent MongoDB container on the VM. Built the Next.js frontend on the VM and exposed it through a loopback SSH tunnel. The frontend, MongoDB, and Rust service now run on the same host.
- Added hashed, single-use signup verification and password-reset codes with ten-minute expiry, resend throttling, and failed-attempt limits. New accounts verify their email and a password change invalidates old sign-in sessions. Added PHISH OUT-branded HTML and plain-text email templates. Verified the configured SMTP credentials from the VM and tested complete auth flows using private SMTP capture.
- Replaced JPEG polling with continuous fragmented H.264 video of the native Chromium window. Chromium runs in a disposable X11 display with native tabs, address bar, navigation, and pointer/keyboard input. Moved scoring to the isolated mission service, removed remote DevTools, and added player-specific best XP, per-mission finishes, and recent results.
- Verified six simultaneous continuous streams and rejection of a seventh. The short direct capture contained 120 frames in eight seconds at 1280×720. Existing accounts were migrated with their access intact.
- Verified the VM build end to end using the private QA inbox: signup, code verification, sign-in, playing Inbox Trap through the native Chromium video, 100 XP in My scores, password reset, and old-session revocation. Confirmed the production stream endpoint rejects unauthenticated requests. Stopped the temporary QA web and mail capture containers after testing.

### Branching missions and lower-latency video

- Expanded the eight original games into three-decision scenarios with believable distractors, inspectable evidence, partial XP, and a decision-by-decision debrief. Added Crush Switch, a fictional chat roleplay with branching messages, a transcript, and safe or compromised endings.
- Kept progression and grading inside the sandbox fixture service. Decisions are tied to the current round and repeat submissions cannot advance it. The app now remembers partial XP and shows partially correct attempts in My Scores.
- Shortened FFmpeg fragments and tuned the player's live edge. A six-stream, eight-second VM smoke test produced 52–53 fragments per stream, up from roughly 30 with the previous settings. This measures delivery cadence, not full input-to-display latency.
- Tested evidence, three-round completion, duplicate decisions and scoring across all nine VM scenarios. Verified a signed-in Crush Switch stream and 67 XP on My Scores in Chrome. Lint, TypeScript, Rust and VM production builds passed.
- The user confirmed a dedicated Gmail inbox still needs to be created. Documented the dedicated-mailbox and sandbox isolation requirements. Inbox Trap continues to use bundled mail.

### Crush Switch chat rebuild

- Reproduced the reported streamed experience in the hosted app. In the regression run the old roleplay took about 2.1 seconds to reach 0.7 seconds of playable video and the click test did not detect an onscreen transition within 3.5 seconds.
- Replaced the roleplay’s streamed quiz with a dedicated, signed-in chat game. Replies show immediately in the transcript, the VM persists every turn, and the story branches across five exchanges. Added clue actions, account takeover and recovery endings, replay, reload/resume, and keyboard focus after replies.
- Results still count toward My Scores. Server-side writes validate the run owner and current round, protect against double submissions, and keep one active chat per player. Crush Switch no longer uses a Chromium seat. The eight browser missions retain native Chromium and the tighter video playback target.
- Deployed the rebuilt chat on the VM. In mobile-sized Chrome testing, five reply bubbles appeared in 34–40 ms and confirmed responses arrived in 66–76 ms over the local SSH tunnel. Verified both endings, reload/resume, replay, duplicate reply protection, scores at 20 and 100 XP, and that Inbox Trap still streams native Chromium. Removed the temporary QA account and its records. Lint, TypeScript, Rust formatting/build, and the VM production build passed.

### Fakestagram sandbox

- Replaced the choice-based Crush Switch chat with Fakestagram, a fictional Instagram-style Direct interface in the VM’s Chromium sandbox. The player types free-form messages; only the turn number is sent to the fixture server.
- Added a fake logout overlay after the third text and a simulated email that leads to a matching signup screen on a separate .example domain. The original chat stays signed in. The demo form uses fixed practice-only details and sends no credentials.
- Added the report and submit endings with My Scores integration and an explanation of how the HTML overlay made a signed-in session look logged out.
- Tested all three tabs, typing, the practice form, and the debrief in Chromium. On the VM verified H.264 playback, both immutable outcomes, and the Rust score readback. Lint, TypeScript, Rust build, and the VM production build passed.

### Fakestagram launch recovery

- Diagnosed the reported launch/blank screen. The VM frontend and Rust controller responded over SSH, while both local forwarded ports (3100 and 8787) stopped accepting connections. Installed a macOS user LaunchAgent for both loopback forwards with SSH keepalives and automatic restart. Verified it recovered both ports after terminating SSH.
- Used a mode-600 SSH identity under the user's SSH directory so the unattended agent can authenticate. The original downloaded key remains in place and neither key is in the repo.
- Added an eight-second video startup deadline, distinct stream failure messages, a same-session reconnect action, and a bounded wait for native fullscreen. Deployed the production frontend update to the VM.
- Passed a Chrome regression test of the deployed play page with video deliberately stalled: the player surfaced the timeout, reconnected to the same session, sent three actual messages through native Chromium, and closed the sandbox. Removed the temporary QA account and records. ESLint, TypeScript, and the VM production build passed.

### Sandbox dialog button spacing

- Added a 12 px gap to the sandbox dialog actions and let the buttons wrap on narrow screens. The VM controller health check responded successfully, but the cause of the reported unavailable screen was not confirmed.
- ESLint, TypeScript, and the production build passed. Deployed the frontend update to the VM and verified that the hosted Games page returned HTTP 200.

### Localhost sandbox launch recovery

- Reproduced the Crush Switch launch failure twice on port 3000. The running development server returned HTTP 400 for a valid mission slug, attempt UUID, and display mode before contacting the VM.
- Restarted the local Next.js development server on port 3000. Repeated the signed-in Chrome test twice and confirmed HTTP 200, live Chromium video, and successful sandbox closure both times. Removed temporary QA accounts and their attempt records. The precise reason the previous server process rejected the request remains unconfirmed.

### Folioo footer credit

- Added a “Powered by Folioo” link below the PHISH//OUT footer wordmark, using the original Folioo mark from its source repository.
- Verified the logo, link, and 44 px tap target in Chrome at 320 px and 1440 px in light and dark mode on localhost. ESLint and TypeScript passed.

### Admin access, Gmail desktop, and smoother missions

- Added a separate admin password and email-code flow for the verified owner account. Codes are bound to the browser challenge, rate-limited, single-use, and expire in ten minutes. Admin sessions are separately scoped and expire in thirty minutes.
- Provisioned a private Chrome desktop on the VM as an unprivileged Linux account. Added admin links for EC2 and the VNC desktop, and forwarded desktop access through the existing macOS SSH LaunchAgent. Verified the tunnel requires VNC authentication and that Chrome opened Gmail. The mailbox owner still needs to sign in to the dedicated Google account.
- Restored direct rendering and immediate local text entry in Crush Switch. Kept the Fakestagram conversation, fake logout, simulated inbox, lookalike, and server-scored endings. Other missions keep their Chromium streams. Updated the streamed mission surfaces and some message copy to look more like their fictional services, with the explanations shown in the debrief.
- Tested the admin password, captured OTP, incorrect code, successful code, replay rejection, and sign-out in Chrome with an isolated local database. Verified hosted SMTP authentication separately. Tested direct chat, the simulated email, link inspection, report, and score. Deployed the frontend and updated browser image to the VM.
- Confirmed all eight streamed missions still complete and score on the VM. Verified the hosted Fakestagram lookalike ending at 0 XP and measured 14 ms from issuing Enter to detecting the outgoing bubble in one Chrome test. Removed the temporary QA accounts and records. ESLint, TypeScript, Docker builds, and whitespace checks passed.

### Direct missions and ranked XP

- Rebuilt Inbox Trap, Link Inspector, Spot the Lookalike, Double Trouble, Tick Tock, Download Roulette, Who’s the Boss?, and Pop-up Panic as direct browser interactions. Each has three staged situations with contextual controls, evidence, simulated consequences, and a debrief. The countdown in Tick Tock adds pressure without deducting time-based points.
- Added server-owned run progression and XP. Decisions earn up to 75 XP and evidence up to 25 XP in those eight missions. Crush Switch now awards partial credit for checking the original session and inspecting the simulated email link. The private Gmail profile stays in the VM desktop and the missions continue to use repeatable fictional mail.
- Added a public leaderboard with pseudonyms, shared ranks for tied totals, a personal rank, and best-per-mission totals. Earlier scoring stays in history. Tested all nine missions in Chrome at mobile width, including duplicate action handling, tied rank, best-score aggregation, and history exclusion from ranked XP.
- Fixed a leaderboard heading overflow found at 320 px. Re-ran all nine mission and leaderboard checks at that width. ESLint, TypeScript, and whitespace checks passed.
- Deployed the ranked arcade on the VM. Verified sign-in routing, progress surviving reload, a partial 25 XP finish, and the resulting personal rank in hosted Chrome at 320 px in dark mode. Removed temporary QA records.

### Restore mandatory VM sandboxes for the hackathon

- Restored the fullscreen Chromium stream as the only play path for all nine missions. Moved the eight rebuilt exercises and their scoring into the disposable VM fixture, restored the three Fakestagram tabs to their fictional hosts, and removed the direct-rendered player and its endpoints.
- Kept the 100 XP rules and leaderboard scoring version so saved scores remain valid. The Rust controller reads completed scores from the fixture’s private socket, and the frontend persists them in MongoDB.
- Deployed both VM images. Verified all nine missions return ranked scores from their isolated containers, six containers can run at once, and a seventh launch receives HTTP 429. In hosted Chrome, verified sign-in, live fullscreen Chromium, native keyboard input revealing Inbox Trap evidence, and a closed sandbox’s final XP appearing on the leaderboard. Removed temporary QA records. Route type generation, TypeScript, ESLint, fixture syntax checks, and both production builds passed.

### Fakestagram training extension

- Added a Manifest V3 extension bundled into the VM image and loaded only for Crush Switch. It acts on the fictional Direct page after Riley’s third reply, overlays a simulated logout, and delivers a fixture inbox message. The simulated account stays signed in. Added two browsable side conversations and two everyday inbox messages.
- Adjusted Chromium startup so Crush Switch loads only the bundled extension. A wildcard extension-install policy blocked unpacked startup even with an allowlisted ID, so the image uses the startup restriction and blocks browser management URLs. Other missions explicitly disable extensions. The disposable containers retain their offline network policy.
- Deployed the VM browser image. Verified with native Chromium keyboard input that the inbox message appears after the third reply, Escape dismisses the extension overlay, and the inbox link opens a real Chromium tab. Verified the reporting and practice-submit paths save 100 XP and 25 XP respectively after inspecting the link. The exercise uses fictional hosts and fixed practice details, with no external email delivery.

### Teaching sites for all nine missions

- Read the pitch’s twelve slides and used its investigate, tag, decide, and debrief loop. Added a working fictional site before the suspicious event in each of the eight non-chat missions, with searchable records, a starting task, and a saved-site shortcut. Chromium navigates between the actual fictional origins inside the isolated VM.
- Added the deck’s internship offer to Inbox Trap, with six individually taggable clues and different credit for reporting, independent verification, archiving, and proceeding. Every scene now explains missed clues and false flags alongside decision and evidence XP. Added a verification takeaway to the Crush Switch debrief.
- Added a next-practice suggestion in My Scores using the lowest completed best score, falling back to an unplayed mission. The player-facing sites use fictional identities and mail. The user identified the separate Gmail mailbox used in the private VM desktop.
- Verified all nine fixtures, the six-sandbox limit, and ranked scores. In native Chromium confirmed that Tick Tock opens a trusted storage site, navigates to the separate notice origin, and lets the player return to the saved site. Verified that a false flag offsets evidence credit.
- Deployed the updated Chromium and frontend images. Rechecked the Crush Switch extension and saved-site navigation on the deployed browser image, and verified the lowest-score suggestion in hosted Chrome with a temporary account. Removed its records. Lint, TypeScript, fixture syntax checks, and both image builds passed.

### Skill profile, learning comparisons, and Gemini

- Added server-scored clue counts for seven skills to all nine disposable browser fixtures. My scores shows the latest measured run per mission and prioritizes practice by missed clues. XP and existing history use the same rules.
- Added a Link Inspector baseline and Spot the Lookalike follow-up, plus comparisons between repeat runs. The baseline and follow-up are existing missions of different difficulty, so these figures are practice feedback rather than a controlled measurement.
- Added aggregate learning gaps to the OTP-protected admin page, with a five-player minimum. Added Gemini brief drafting from the fixed mission catalog and admin review and publication to My scores. Documented server-side key setup for local development and the VM.
- Verified nine fixture payloads against the existing Rust response size limit, cohort aggregation in a disposable local MongoDB database, and Gemini response handling with a mocked endpoint. SSH timed out, so the VM images and live Gemini remain unverified.
- Reconnected at 3.110.76.19, updated the local SSH tunnel and admin desktop instructions, and deployed both learning images. Copied the Gemini settings to the VM environment without printing them. Verified a live structured Gemini response, the admin and leaderboard pages, and the sandbox health endpoint.
- Deployed immediate decision feedback and an optional recall prompt across the eight evidence missions. The review names a missed clue and an ordinary detail the player flagged when applicable. Added inline tagging instructions and shortened the delay between native wheel events. Checked all eight feedback sequences inside the built VM image. End-to-end latency and learning outcomes have not been measured.
- Measured the running VM's 720p Chromium video encoder in a disposable Xvfb container. Median time between MP4 fragments fell from 133 ms to 67 ms over 20 fragments per configuration. Deployed the shorter fragment interval for new sessions. The local tunnel health request took 133 ms. These measurements cover separate portions of the interaction path.
- Added a Chromium new-tab page with mission shortcuts. Verified opening a second tab and switching back to Novabyte Mail in a disposable browser on the VM. Deployed the updated browser image.
- Deployed app-specific opening tasks across the eight evidence missions, with searchable records, a reading pane and saved items. Added conversation search and a Saturday poll to Crush Switch. Added a Google browsing link to the outer game toolbar that opens a separate local tab. The disposable Chromium game remains offline. Checked both browser scripts, TypeScript, production builds and the hosted games route.
- Deployed offline photographic covers for media, news and workspace records, sender avatars for messaging, file badges for storage, and revised encounter and chat styling. Verified the four JPEGs through the fixture HTTP server inside the deployed offline image.
- Deployed the Saturday confirmation investigation, decision timeline and unranked rewind. Verified native Chromium typing after the notice and server scoring. Added the local Field Desk with a file-delivery transfer case, device-saved notes and an offline URL inspector. Browser-tested receipt verification, note persistence and URL parsing. Hosted build, lint and TypeScript passed.
- Added a Gemini-powered message review to Field Desk. Signed-in users receive warning signs and a verification step for pasted email or SMS. The review uses the existing Gemini server settings and keeps only a per-account request cooldown in MongoDB. Lint, TypeScript, and diff checks passed.
- Put a three-message, no-typing simulation at the top of Field Desk. It gives immediate feedback on urgency, impersonated authority, and corroborated routine mail, followed by a session score. Gemini message review remains available below the exercises.

## 2026-11-19

### In-browser missions

- Rebuilt all nine missions to play directly in the player's tab while the VM is off. Each has its own fullscreen stage that imitates its app: a webmail client, a news site with a link status bar, lookalike login pages with an address magnifier, side-by-side sign-in windows, a live fake countdown, a download shelf, a workplace chat with typing and a voice note, a video page with permission prompts and junk pop-ups, and a three-tab Fakestagram with free typing, a fake logout, mail and a lookalike signup.
- Ported the fixture scoring (`mission.py`, `fakestagram.py`) to TypeScript under `lib/missions/`. Runs live in MongoDB `mission_runs` with optimistic revisions, so duplicate clicks cannot advance a mission. Completed runs also write a `browser_attempts` record (display `direct`) in the existing format, so My scores, the leaderboard and the educator view count them unchanged. Answers and clue explanations stay on the server until a decision is made.
- Added a per-game `mode`. Seven missions are native; Spot the Lookalike and Pop-up Panic default to the VM sandbox and offer "Play in this tab" when no sandbox is available.
- Added briefing, evidence board, per-decision feedback, graded debrief with confetti, synthesized sound with a mute toggle, and a fullscreen button.
- Verified locally in Chrome with a seeded QA account: a full Inbox Trap run scored 87 XP, matching the fixture rules, and saved to MongoDB with learning data; Crush Switch's safe path scored 100 XP. Opened every other mission's first situation. ESLint and TypeScript passed.
- Redesigned the in-browser game UI. Replaced emoji with Pikaicons throughout, and moved to a neutral app-style shell: a compact toolbar with exit, progress, XP, evidence, sound and full screen; an inspector-style evidence panel with checkboxes; and quieter briefing, feedback and results screens. The browser frame now has real toolbar icons and a padlock that opens a site-information popover showing who owns the page.
- Redrew each game to resemble the product it imitates: webmail, an editorial news site, a workspace sign-in, side-by-side windows, a cloud storage app with a suspension banner, a file delivery page with the browser's download panel, a team chat and a streaming site with permission prompts. Hovering the main link in Inbox Trap and Link Inspector now checks it and shows its destination in the status bar.
- Reviewed every game at 1366×820 in Chrome with no console errors. ESLint, TypeScript and the production build passed.
- Added 17 free photos from Unsplash (Unsplash License), fetched through Lorem Picsum and stored in `public/missions/photos/` (about 0.9 MB). They're used in the Dailybyte lead story, story thumbnails and article headers, the Orchard Video hero, tiles and player, the Novabyte sign-in side panel, and profile photos for Riley, Jordan, Pizza people, Avery and Mira (chat, call tiles and Fakestagram). Photographer credits are in `credits.json` and the README.
- Fixed a dev error on the play route: `auth()` uses crypto, so the page now calls `await connection()` first, matching My scores and the leaderboard.

### Gemini in the games, prediction and a simpler My scores

- Removed Field Desk (page, three-message simulation and pasted-message Gemini review) and its links.
- Added a shared server-side Gemini client. In every scene mission, a Coach panel gives up to two hints per situation. It is told never to name the suspicious detail or the right action, and hints that repeat an action label are dropped. Hints are recorded but don’t affect XP. Crush Switch now has Gemini write Riley’s replies to what the player typed. The text is used only for that reply, a scripted line is used if Gemini fails, and replies supplied by the browser are ignored. Finished missions get a Gemini coach report with skill ratings kept within one step of the measured clue results; it’s stored on the run and attempt.
- Added `lib/prediction.ts`: per-skill miss chances and an overall risk from completed runs. It calls `PREDICTION_MODEL_URL` (validated, 3 s timeout) and falls back to a Beta-posterior baseline. Added an admin-only JSON Lines training export without user IDs, and `model/` with a dependency-free logistic-regression trainer and server using the same API. Trained weights are ignored by git.
- Rebuilt My scores as one column: totals and rank, the risk card with per-skill bars and its source, missions with best-XP bars, and the five most recent runs. The before/after comparisons were removed.
- Verified live with Gemini: a hint for Inbox Trap, a full run with the coach report, and Riley replies (3–5 s with minimal thinking) including a prompt-injection attempt and a spoofed reply. Trained and served the reference model on synthetic data. ESLint, TypeScript and the production build passed.

### Canvas loader, ASCII 404 and leaderboard

- Added an animated ASCII canvas (`components/ascii-canvas.tsx`) that follows the theme tokens and draws one still frame under reduced motion. `app/loading.tsx` and every page's Suspense fallback now use it: a fish swimming through character waves under a waving PHISH//OUT wordmark. `app/not-found.tsx` shows a block-character 404 with a fish caught on a hook.
- Rebuilt the leaderboard: a top-three podium, your standing (rank of total players, share of players you’re ahead of, XP to the next rank), and a standings list with generated alias badges, XP bars against the 900 XP maximum, and mission-progress dots. The leaderboard query now returns the ranked player count.
- Reviewed with temporary demo rows at desktop and mobile width (no horizontal overflow), then removed them. ESLint, TypeScript and the production build passed.

### Profiles, QR page and test-data cleanup

- Removed sample players: 46 seeded demo rows and six QA accounts (phish-qa-*@example.com and qa-native@phishout.example), with their attempts, runs and sessions. Only the two real accounts remain ranked.
- Added `/profile`: a display name (2–24 characters, unique case-insensitively) and a profile photo upload (PNG/JPEG/WebP up to 2 MB, type checked from file bytes). Photos are stored on local disk in `UPLOAD_DIR` (default `.data/uploads`, git-ignored; `/data/uploads` volume in Docker) and served by `/api/avatars/[userId]` with nosniff and a sandboxing CSP. The navbar shows the photo as a link to the profile, and the leaderboard shows names and photos, falling back to the alias and generated badge.
- Added `/qr`: a branded SVG QR code for https://phishout.folioo.tech with dot modules, pink finder centres and a PHISH//OUT centre mark (error correction H), plus an SVG download. Chrome’s BarcodeDetector decoded it to the right URL.
- Tested upload, a fake PNG and an invalid name (both rejected), serving headers and the navbar photo with a temporary account, then deleted that account and its photo. ESLint, TypeScript and the production build passed.

### Theme toggle, navigation, Fakestagram profiles and the AI page

- Fixed the theme toggle icon: both sun and moon render and the `.dark` class picks one in CSS. The server-rendered sun no longer flashes and swaps in dark mode, and the icons no longer overlap during the theme wipe.
- Decluttered the navbar to Games, Leaderboard and AI, plus an account menu (My scores, Edit profile, Sign out) with the player’s photo and name. Added a hamburger menu for mobile.
- Crush Switch: your own chat lines are kept in sessionStorage per run, so a reload or dev refresh no longer shows “(your message)” placeholders; missing lines are skipped. Added Fakestagram profiles for Riley, Jordan and Sam (header, bio, highlights, a 3-column grid and a post viewer with likes), opened from the left rail, thread avatars and the chat header. The address bar follows the profile. Added 21 Unsplash-licensed photos (date-night and golden-hour themed, nothing explicit) with credits.
- Added `/architecture`: an interactive system diagram (browser, server, mission engine, MongoDB, Gemini, prediction model, VM sandbox) with animated request flow and component details, and a live demo that trains the reference model architecture (seven sigmoid units) in the browser on 400 simulated players. It shows weights on a canvas, a loss curve and sliders for trying a player. The page says plainly that the demo data is simulated.
- Checked the theme in both modes and after a dark reload, the mobile menu, live training, and Riley’s profile and post viewer. ESLint, TypeScript and the production build passed.

### Endless mode, VM fleet, new VM address and polish

- The VM moved to 65.0.123.34. Verified over SSH (host key added on first connect): the sandbox service is active, the controller answers `/health`, and the hosted frontend returns 200. Repointed the macOS tunnel agent (the old file is kept as `.bak-3.110.76.19`) and the admin VNC command. Local ports 8787 and 3100 work through the tunnel.
- Added an authenticated `/status` route to the Rust controller (capacity, mission slugs, ages; no owners). It hasn’t been compiled, because no Rust toolchain is installed locally, and hasn’t been deployed. Added `/api/sandbox/status`, which falls back to `/health`. Added a boot sequence showing the controller’s real launch steps while a sandbox starts.
- Rebuilt `/architecture` as a dark lab page: an interactive request trace across four lanes with auto-play, a live sandbox fleet with six slots and isolation layers, and a fully connected 7×7 prediction layer with animated signal pulses, ring gauges, a clickable weight matrix and custom range sliders. It is trained in the browser on simulated players.
- Nav tabs now share a sliding Motion pill and can’t wrap at mid widths. Replaced the sparkle icon with a lightbulb in the coach UI. Added a fishhook favicon (`icon.svg`, `favicon.ico`, `apple-icon.png`).
- Added Endless mode: Gemini-written missions in the hand-built scene format, validated server-side (fictional hosts only, a safe action and an ordinary clue in every situation, one genuine email). Runs store their own scenes; the coach and report work on them. Live generation took 14–18 s with minimal thinking. Played one run in the browser, then deleted the temporary account.

### VM terminal missions and illustrations

- Added a terminal sandbox service (`sandbox/terminal/service.py`, Python standard library only). It gives one interactive bash per player through a PTY. On the VM each shell is a disposable Docker container with no network, a read-only root and case folder, all capabilities dropped, `no-new-privileges`, and caps of 64 processes, 128 MB and half a CPU. It allows six shells at once and one per app session, with 5-minute idle and 20-minute lifetime limits, owner-bound bearer-secret access, and long-polled output. There is an explicit `local` runtime for development only. Added the image (`file`, `unzip`, `binutils`, `xxd`), a systemd unit, case-file generation and docs. Not yet built or deployed on the VM.
- Added two terminal-only missions. In Header Hunt the player greps SPF results and Reply-To and base64-decodes a hidden link. In Payload Autopsy the player uses `file`, `strings`, `unzip -l` and `sha256sum` against a blocklist. Answers are graded server-side: 25 XP first try, 15 after a miss, with explanations once solved and learning data per skill. Added xterm.js in the game frame with a case panel, an offline-VM state and the shell lifecycle (one shell per player, closed on page exit and after completion).
- Tested end to end with the local runtime: real commands, owner isolation (404 for another owner, 401 without the secret), 80 XP saved correctly, and the shell destroyed on completion. Found and fixed grading that rejected `xl/vbaProject.bin`, React’s double-mount opening two runs, and xterm breaking server rendering. 14 grading unit cases pass.
- Drew five original SVG illustrations in the brand palette: an envelope on a hook, the Endless mail loop, a terminal under a lens, a sandbox crate and a shield with a bent hook. Placed them on the Games hub, Endless, terminal and sandbox game pages, and the scores and leaderboard empty states.

### Deployed to the VM (65.0.123.34)

- Redrew the hooked-mail illustration as a clear J-hook through a punched hole, and kept it inside the Games banner (shown from laptop width up).
- Rebuilt the Rust controller on the VM with `/status`; the previous binary is kept as `phish-out-sandbox.pre-terminal`. Built `phish-out-terminal:local` and started `phish-out-terminal.service` in Docker mode. A smoke test ran commands in a container as a non-root user with a read-only case folder and no network, and the container was removed on close.
- Rebuilt the frontend image (`phish-out-frontend:terminal`) and recreated the container with its previous environment, now in root-only `/etc/phish-out-frontend.env`, plus `TERMINAL_URL` and a `phishout-uploads` volume at `/data/uploads`. The previous container is kept stopped as `phish-out-frontend-prev`.
- Fixed `/api/sandbox/status` being prerendered at build time (it reported offline); it now calls `connection()`. Pages, assets, the 404 and the API guard respond on the VM, and the fleet reports online with 0 of 6 in use.
- Verified Header Hunt in signed-in Chrome through the VM frontend. Typed a command into xterm, saw the container output, solved all four questions, and confirmed 100 XP in MongoDB. Removed the temporary account and its run records. Confirmed the fleet endpoint reports online and both controllers are active, then removed the stopped frontend backup and the pre-terminal controller binary.
- Fixed the terminal offline message on localhost. The VM terminal was running, but the macOS SSH tunnel did not forward port 8788. Added the forward to the installed LaunchAgent and template. The terminal health check now responds through the tunnel in Docker mode.
- Renamed the live terminal badge to “connected · internet disabled” so network isolation reads separately from VM availability. Both health endpoints and sandbox status passed through the local tunnel.
- Fixed the Architecture page layout with section shortcuts, responsive request lanes and model columns, a locally scrollable weight matrix, and keyboard-selectable skills. Checked Chrome at 320, 768 and 1440 px. Lint and TypeScript passed.
- Created Pip, an original anglerfish in Blender, with animated brows, fins, mouth and six retractable fangs. Added the editable model and a web GLB, plus /mascot with orbit, zoom, expression scrubbing and a swim toggle. Tested both expression endpoints in Chrome.

### What each game teaches

- Added learning outcomes for all eleven missions and Endless mode (`learningFor` in `lib/games.ts`): the skills trained (matching the seven the prediction model tracks), three takeaways and a real-world example. Each game page shows a “What you’ll learn” section after “How to play”, Endless shows it on its page, and in-game briefings list the skills you’ll practise. Checked all twelve pages locally; lint, TypeScript and the build passed. Not yet deployed to the VM.
- Reworked Pip’s Blender materials with a vertex-painted guava-to-lagoon coat, luminous scales, mint fins and a multicolour crest. Added a curious side glance, narrowing pupils, lifting crest, curved grin and larger outer fangs. Tested Cute, Curious and Scary in the local Chrome viewer.
- Updated Pip with a solid teal body material, indigo fins, gold peacock-eye markings and an orange marigold lure. Versioned the model URL so browsers fetch the updated Blender export and tested the transformation on localhost.
- Recolored Pip raspberry pink with plum fins and a coral belly, changed the stage to blush, and visually confirmed the local Chrome render with the revised asset URL.
- Softened Pip’s model materials to dusty rose, muted plum and honey, including the eyes and crest. Updated the editable Blender file and web asset.
- Rebuilt Pip in Blender as a dusty-rose dinosaur hatchling with sculpted tiger stripes, round monkey ears and a curled tail. Added a lowering jaw and extending canines to the scary pose, and replaced swimming with bouncing. Checked all three expression presets and the bounce control in Chrome.
- Sculpted curved calf horns, a pink bovine muzzle, broad ears, cub shoulders and animated padded bear paws onto Pip’s striped dinosaur body. Updated the Blender source, GLB and mascot page. Exercised all three expressions and Bounce in Chrome.
- Simplified Pip’s Blender silhouette around two cream horns and a curled tail. Removed the layered stripes, dorsal plates, claws and individual finger pads. Kept the facial expression animation.
