# Cook for a Crowd

A small local web app for planning meals for a group event — scale recipes to a
headcount, get a shopping list, and print a cook's plan for the kitchen. Built for
planning a Scout troop's quarterly court-of-honor meal, but works for any
recipe-scaling-for-a-crowd problem.

See **[USER_GUIDE.md](USER_GUIDE.md)** for the full walkthrough of every feature.

## What it does

- **Import or generate recipes** — paste a URL, HTML, or plain recipe text, or
  describe a recipe and let AI write one (with realistic portion sizes for
  mains vs. sides vs. desserts).
- **Scale to a headcount** — set an event's RSVP count plus a no-show buffer,
  and every recipe scales to the resulting target. Scaling respects reality:
  discrete items (eggs, chicken breasts) round up to whole numbers, divisible
  packaged goods (a can of soup, a sleeve of crackers) don't.
- **Pan- and pot-aware** — record the pan or pot a recipe was made in (baking
  pans by area, stovetop pots by capacity) and rescale it to a different
  vessel, or size a dish to a whole number of pans/pots for an event.
- **Variants** — handle a gluten-free or allergen-free batch of a dish
  alongside the standard one, each with its own ingredient list and headcount.
- **Shopping list & cook's plan** — a combined shopping list across every dish
  at an event, and a cook's plan with per-pan/per-pot ingredient breakdowns.
  Both display inline and have a dedicated printable view.
- **Guest menu** — a separate, quantity-free list of what's being served, by
  course, with its own printable/PDF-exportable view for sharing with
  attendees.
- **Drinks planner** — plan teas, lemonade, soda, and water separately from
  food, sized by fluid ounces per person and by purchase unit (can, bottle,
  gallon jug). Can suggest a realistic lineup and headcount split with AI
  (e.g. "tea and lemonade" for a Southern event comes back weighted toward
  sweet tea, not an even split).
- **Supplies & store-bought items** — one-click presets for plates, napkins,
  utensils, and ice at standard per-person amounts, plus a place to track
  dishes you're buying or ordering instead of cooking.

## Stack

Next.js (App Router, TypeScript) + Tailwind, SQLite via `better-sqlite3` (no
separate backend), Anthropic's API for the optional AI features. See
`CLAUDE.md` for the design principles the app is built around.

## Getting started

### The easy way

Pick the one for your OS. Each installs everything the first time (the first
run takes a minute or two), starts the app, and opens it in your browser.
Every run after that is fast — the macOS script only rebuilds when the code
has actually changed since last time; the two Docker-based ones let
Docker's own build cache do the same thing.

- **macOS** — double-click **`Start Cook for a Crowd.command`**. Runs
  natively (no Docker needed). Keep the window it opens on screen while
  you're using the app; closing it (or hitting Ctrl+C) stops the app. Needs
  Node installed once — see Prerequisites below.
- **Windows** — double-click **`Start Cook for a Crowd.bat`**. Needs
  [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  installed and running first. Unlike the macOS script, the app keeps
  running in the background afterward (as a Docker container) even after
  the window closes — run **`Stop Cook for a Crowd.bat`** when you're done.
- **Linux** — run `./start-cook-for-a-crowd.sh`. Needs
  [Docker](https://docs.docker.com/engine/install/) installed and running
  first. Same background-container behavior as Windows — run
  `./stop-cook-for-a-crowd.sh` when you're done.

Windows and Linux go through Docker specifically to sidestep
`better-sqlite3`'s native addon compile step — the actual cross-platform
pain point, especially on Windows, where getting a working C/C++ toolchain
set up is real friction. The native module compiles once, inside the
Docker image, against a known-good environment; you never need a compiler
on your own machine. All three ways read and write the same `data/` folder
on your computer, so switching between them (or moving to a different
machine) doesn't lose anything.

### Prerequisites

- **For the macOS launcher**: [Node.js 22 or later](https://nodejs.org/)
  (check with `node --version`) and a C/C++ build toolchain, needed the
  first time `npm install` compiles `better-sqlite3`'s native addon —
  Xcode Command Line Tools: `xcode-select --install`.
- **For the Windows/Linux launchers**: [Docker](https://docs.docker.com/get-started/get-docker/)
  (Docker Desktop on Windows, Docker Engine or Desktop on Linux) — nothing
  else, no Node install needed on the host at all.
- **Running the app directly with Node** (any OS, no launcher script) needs
  Node 22+ and the same native build toolchain as macOS above — on Linux
  that's `build-essential` and `python3` (e.g.
  `sudo apt install build-essential python3`); on Windows, either
  [WSL](https://learn.microsoft.com/windows/wsl/) plus the Linux
  instructions, or the "Desktop development with C++" Visual Studio
  workload.
- An [Anthropic API key](https://console.anthropic.com/settings/keys) — optional, only needed
  for the "Generate with AI" recipe and drink-suggestion features. Everything else (import,
  manual entry, scaling, shopping lists) works without one.

### Install and run

```bash
git clone https://github.com/apratsunrthd/cook-for-a-crowd.git
cd cook-for-a-crowd
npm install
cp .env.example .env.local   # optional: add an ANTHROPIC_API_KEY for AI features
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is
created automatically at `data/cook-for-a-crowd.sqlite` on first run — no
separate database setup needed. This is a single-user, run-it-yourself app;
there's no auth and no multi-tenant support, by design (see `CLAUDE.md`) —
this matters a lot more if you ever put it somewhere besides your own
machine, see [Deploying to the cloud](#deploying-to-the-cloud-optional)
below before you do.

### Running it for real use

This app isn't deployed anywhere — it's meant to run on your own machine
(or a home server) for as long as you're using it:

- The launcher above runs a production build (`npm run build && npm start`,
  rebuilding only when needed). `npm run dev` also works fine if you're
  editing the code yourself and want hot-reload — it just always reflects
  whatever's on disk with no separate build step, at the cost of a bit more
  per-page latency and no upfront type-check.
- Back up `data/cook-for-a-crowd.sqlite` yourself if you care about the
  recipes and events in it — it's a single file, gitignored, and not backed
  up anywhere automatically. Copying it elsewhere (or into your own private
  repo/cloud drive) is enough.
- To keep it running in the background, use whatever you'd normally reach
  for (`tmux`, `screen`, a `launchd`/`systemd` unit, `pm2`) — there's
  nothing app-specific here. The Windows/Linux Docker launchers already do
  this for you (the container's `restart: unless-stopped` policy brings it
  back after a reboot or Docker restart on its own).

## Deploying to the cloud (optional)

### ⚠️ Read this before you put this anywhere but your own machine

**This app has no login.** No username, no password, no accounts, nothing —
by design, for a tool meant to run on your own computer where "who can open
this" is already answered by "whoever can sit down at your computer." If you
deploy it somewhere with a public URL and share that URL (or someone finds
it), **whoever has the link gets the exact same full control you have** —
every event, every recipe, deleting anything, editing anything. There's no
read-only mode, no per-user permissions, nothing held back. If you've added
an `ANTHROPIC_API_KEY`, they can also trigger AI generation calls billed to
your account.

If you're only going to reach it from your own devices, the safest option is
to not expose it publicly at all — connect over a VPN, [Tailscale](https://tailscale.com/)
or similar, or an SSH tunnel (`ssh -L 3000:localhost:3000 you@your-server`),
and never open the port to the wider internet in the first place. If you do
want a real public URL (e.g. to reach it from your phone without a VPN
app), put it behind the username/password proxy described below — treat
that as the minimum, not as making it fully safe to advertise widely, since
anyone who guesses or is given that one shared password still gets full
control, same as anyone on your own machine would.

### Optional: put it behind a username and password

Both deployment options below can run an included [Caddy](https://caddyserver.com/)
reverse proxy (`Caddyfile`, wired up in `docker-compose.yml` as an opt-in
`proxy` profile) that adds HTTP Basic Auth and automatic HTTPS in front of
the app. To set it up:

1. Generate a password hash: `./deploy/generate-basic-auth-password.sh yourpassword`
   (uses Docker, so it works the same regardless of what's on your host).
2. Add the three lines it prints, plus a `DOMAIN`, to `.env.local`:
   ```
   DOMAIN=cookforacrowd.example.com
   BASIC_AUTH_USER=yourusername
   BASIC_AUTH_HASH=$$2a$$...                # exactly as the script prints it
   ```
   `DOMAIN` needs to be a real domain pointed at your server's IP — Caddy
   uses it to automatically get a Let's Encrypt certificate. Without a
   domain of your own, stick to the VPN/SSH-tunnel approach above instead.
3. Start (or restart) with the proxy included: `docker compose --profile proxy up -d --build --wait`.

### Option 1: Fly.io (recommended — simplest with real persistent storage)

Most "serverless container" platforms (see below for why they're not a
great fit here) don't give you a real local disk, which this app's SQLite
file needs. [Fly.io](https://fly.io/) does, cheaply, via
[Volumes](https://fly.io/docs/volumes/overview/):

```bash
# Install flyctl if you don't have it: https://fly.io/docs/flyctl/install/
fly auth login
fly launch --no-deploy      # detects the Dockerfile; let it adjust fly.toml if it wants to
fly volumes create cook_for_a_crowd_data --size 1
fly secrets set ANTHROPIC_API_KEY=sk-ant-...   # optional, for AI features
fly deploy
```

`fly.toml` in this repo is a starting point already wired up for the
volume and for scaling to zero when idle (cheaper for a personal tool that
isn't used all day, at the cost of a few seconds' cold start on the next
visit). Fly's own edge network already handles HTTPS for you (`force_https`
in `fly.toml`), so unlike the VM path you don't need Caddy for that part —
just Basic Auth. The included `docker-compose` `proxy` profile is
Compose-specific and doesn't apply directly on Fly; if you want the same
one-command Basic Auth setup, Option 2 (a VM) keeps everything in the one
docker-compose file. Adding Basic Auth on Fly itself is possible (e.g. a
small second Fly app running Caddy on Fly's private network in front of
this one) but needs more manual wiring than this README covers — reach for
the VM path if that one-command setup matters more to you than Fly's
scale-to-zero pricing.

### Option 2: A VM on GCP, AWS, or any VPS

Since the app is already Dockerized, any VM with Docker works identically
to your own machine — `deploy/cloud-vm-setup.sh` installs Docker, clones
this repo, and starts it, safely defaulting to **not** publicly exposed
(the app binds to the VM's own localhost only until you set up the Basic
Auth proxy above and re-run with `--profile proxy`).

**GCP (Compute Engine):**
```bash
gcloud compute instances create cook-for-a-crowd \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
  --machine-type=e2-small --boot-disk-size=20GB \
  --metadata-from-file=startup-script=deploy/cloud-vm-setup.sh \
  --tags=cook-for-a-crowd

# Only after you've set up the Basic Auth proxy (above) -- this opens the
# instance to the public internet on 80/443:
gcloud compute firewall-rules create cook-for-a-crowd-web \
  --allow=tcp:80,tcp:443 --target-tags=cook-for-a-crowd
```

**AWS (EC2):** the console is more reliable here than a copy-paste CLI
command, since the right AMI ID is region-specific and changes over time.
Launch an instance → Ubuntu 24.04 LTS → paste `deploy/cloud-vm-setup.sh`
into the "User data" field under Advanced details → in the security group,
only open port 22 (SSH, for yourself) until the Basic Auth proxy is set
up, then add 80 and 443.

Either way: SSH in, add your `ANTHROPIC_API_KEY` and (if you want it
public) the Basic Auth settings to `/opt/cook-for-a-crowd/.env.local`, then
`cd /opt/cook-for-a-crowd && docker compose --profile proxy up -d --build --wait`.

### Why not Cloud Run, App Runner, or other "serverless" container platforms?

They're not a good fit for *this* app specifically: their whole model is
disposable, ephemeral containers with no local disk that persists between
requests (or between scale-to-zero cycles) unless you separately wire up
external storage (a mounted network filesystem, a managed Postgres
instead of SQLite, etc.) — real work this app isn't built for. Deploy this
app to one of them as-is and you'd very likely lose all your data the
first time it scales down, exactly the kind of silent data loss this
project has already run into once during development. A VM or Fly.io, both
with a real attached disk, avoid the problem entirely by being closer to
"your own machine, just hosted somewhere else" — which is really all this
app has ever assumed it's running on.

## Testing

```bash
npm test        # run once
npm run test:watch
```

## Development notes

This project was built with [Claude Code](https://claude.com/claude-code) using
[gstack](https://github.com/apratsunrthd/gstack) (a personal fork of
[garrytan/gstack](https://github.com/garrytan/gstack)) for the AI-assisted
workflow — see `CLAUDE.md` for the setup. That's tooling context, not a
requirement for running the app itself.
