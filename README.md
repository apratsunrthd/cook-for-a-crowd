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

```bash
npm install
cp .env.example .env.local   # optional: add an ANTHROPIC_API_KEY for AI features
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is
created automatically at `data/cook-for-a-crowd.sqlite` on first run.

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
