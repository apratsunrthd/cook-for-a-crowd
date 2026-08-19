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

### Prerequisites

- **Node.js 20 or later** (check with `node --version`).
- A C/C++ build toolchain, needed the first time `npm install` compiles
  `better-sqlite3`'s native addon:
  - **macOS** — Xcode Command Line Tools: `xcode-select --install`
  - **Linux** — `build-essential` and `python3` (e.g. `sudo apt install build-essential python3`)
  - **Windows** — easiest via [WSL](https://learn.microsoft.com/windows/wsl/) using the Linux
    instructions above; native Windows works too with the "Desktop development with C++"
    Visual Studio workload, but WSL is the smoother path.
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

- `npm run dev` is fine for normal use; it doesn't need to be "production."
  If you'd rather run a built version, `npm run build && npm start` works
  the same way, just without hot-reload.
- Back up `data/cook-for-a-crowd.sqlite` yourself if you care about the
  recipes and events in it — it's a single file, gitignored, and not backed
  up anywhere automatically. Copying it elsewhere (or into your own private
  repo/cloud drive) is enough.
- To keep it running in the background, use whatever you'd normally reach
  for (`tmux`, `screen`, a `launchd`/`systemd` unit, `pm2`) — there's
  nothing app-specific here.

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
