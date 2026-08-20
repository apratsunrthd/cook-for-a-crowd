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
there's no auth and no multi-tenant support, by design (see `CLAUDE.md`).

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
