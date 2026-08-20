# Cook for a Crowd — User Guide

A local web app for planning a meal for a group: scale recipes to a headcount,
plan drinks and supplies, and produce a shopping list and cook's plan you can
take into the kitchen or to the store.

This guide walks through the whole workflow, start to finish. For setup
instructions (installing, running), see [README.md](README.md).

## Contents

- [The basic workflow](#the-basic-workflow)
- [Settings](#settings)
- [Recipes](#recipes)
  - [Importing a recipe](#importing-a-recipe)
  - [Generating a recipe with AI](#generating-a-recipe-with-ai)
  - [Giving feedback or regenerating](#giving-feedback-or-regenerating)
  - [Pan and pot sizes](#pan-and-pot-sizes)
  - [Changing a recipe's vessel later](#changing-a-recipes-vessel-later)
- [Events](#events)
  - [Creating an event](#creating-an-event)
  - [Target headcount and the no-show buffer](#target-headcount-and-the-no-show-buffer)
- [The meal plan](#the-meal-plan)
  - [Attaching a recipe](#attaching-a-recipe)
  - [Variants (allergen-free or modified batches)](#variants-allergen-free-or-modified-batches)
  - [Sizing a dish by pan or pot instead of typing servings](#sizing-a-dish-by-pan-or-pot-instead-of-typing-servings)
- [Store-bought and catered items](#store-bought-and-catered-items)
- [Drinks](#drinks)
  - [Adding a drink manually](#adding-a-drink-manually)
  - [Suggesting a drink lineup with AI](#suggesting-a-drink-lineup-with-ai)
- [Supplies](#supplies)
- [The menu](#the-menu)
- [The cook's plan](#the-cooks-plan)
- [The shopping list](#the-shopping-list)
- [Printing](#printing)
- [How scaling and rounding work](#how-scaling-and-rounding-work)
- [Troubleshooting](#troubleshooting)

## The basic workflow

1. Build up a library of **recipes** — import them from a URL, paste one in,
   or generate one with AI.
2. Create an **event** with an RSVP count and a buffer for people who show up
   without RSVPing.
3. Attach recipes to the event's **meal plan**, add any **drinks**,
   **supplies**, and **store-bought items**.
4. Use the **cook's plan** on the day of, and the **shopping list** to buy
   for it ahead of time.

Everything scales automatically from the event's target headcount. Change
the RSVP count and every dish, drink, and supply recalculates.

## Settings

One page, reached from the top nav, for configuration that isn't tied to
any particular event or recipe. Right now that's just the Anthropic API
key that powers the AI features (Generate with AI, Suggest drinks) — paste
one in and it works immediately, no file editing or server restart. Shows
the last 4 characters of whichever key is currently active so you can
confirm it's the one you meant, and a "Remove saved key" option to go back
to whatever's (if anything) set via the `ANTHROPIC_API_KEY` environment
variable. Nothing here is required — every non-AI feature works with no
key configured at all.

## Recipes

Recipes live in a shared library (`/recipes`) so you can reuse them across
events — a recipe you use every quarter only needs to be entered once.

### Importing a recipe

On `/recipes/new`, paste one of:

- **A URL** — the app fetches the page and pulls out the recipe's structured
  data (name, ingredients, servings, image).
- **The page's HTML** (view-source) — useful when a site blocks automated
  fetches but you can still open it yourself in a browser. Copy the page
  source and paste it in.
- **Plain recipe text** — just copy the visible ingredients and instructions
  off a page (or type them from a cookbook) and paste them in as plain text.
  The app splits it into ingredients and instructions heuristically.

The app auto-detects which of the three you pasted. Whichever it is, you
land in the recipe editor with everything pre-filled — review and fix
anything before saving, especially the servings number (a scraped "yield" is
sometimes something other than servings, like "makes 2 dozen cookies").

### Generating a recipe with AI

Also on `/recipes/new`, the "Generate with AI" box takes a plain description
("a simple recipe for canned green beans") and a course (Main/Side/Dessert —
this affects portion sizing, since people take less of a side than a main).
If you got here from an event's "Add recipe" flow, generation automatically
sizes the recipe for that event's target headcount instead of a generic small
batch.

### Giving feedback or regenerating

After generating, you land on a review screen — the recipe isn't saved yet.
From there:

- **Use this recipe** — proceeds to the full editor to review/save.
- **Try again** — a fresh attempt with the same prompt (useful when you just
  don't like this particular result).
- **Give feedback and revise** — type what you'd change ("less spicy", "use
  chicken thighs instead of breasts", "make it vegetarian") and the AI
  revises the *same* recipe to address it, rather than starting over.

You can try again or revise as many times as you like before committing to
one. This review step only applies to AI-generated recipes — an imported one
goes straight to the editor, since it's already a specific, real recipe.

### Pan and pot sizes

A recipe can record the vessel it's written for — a baking pan (by width x
height, or diameter for round) or a stovetop pot (by quart capacity). This
isn't required (a salad doesn't need one), but recording it lets you rescale
the recipe to a different vessel later, and lets an event show you how many
pans/pots of that size you'll need.

AI generation and URL import both try to detect or infer a sensible vessel
automatically. Pot sizes are always one of the standard sizes you'd
actually own (2, 4, 6, 8, 12, 16, 20, or 32 quarts) — never an arbitrary
number — and are sized to comfortably fit the recipe's ingredients without
needing to be filled to the brim.

If you cook out of a commercial kitchen, the pan picker also includes
standard steam table / hotel pan sizes (full, half, third, sixth, and
ninth) alongside the usual home baking pans — pick whichever family
matches the vessel you'll actually use.

### Changing a recipe's vessel later

Open a saved recipe (`/recipes/[id]`) and the pan/pot field is right there,
editable. Two different things can happen when you pick a different vessel:

- If the recipe **has no servings recorded yet**, or the new vessel is
  otherwise consistent with what's there, it's just recorded — no other
  change needed, since the field is only being asked to remember what
  vessel a valid recipe already uses.
- If the recipe **already has real servings**, changing the vessel opens a
  small prompt: does the current servings number actually make sense for
  the new vessel, or are you cooking for a different number of people? Enter
  a headcount and the recipe's servings and every ingredient quantity scale
  to match. This prevents an inconsistent recipe — like one that claims to
  serve 6 people out of a 20-quart pot — from ever being silently created.

There's also a dedicated "I actually want to cook this in a different
pan/pot" tool right below the vessel field, which rescales by area/capacity
ratio in one step without needing to type a target headcount directly.

## Events

### Creating an event

`/events/new` — name, date (optional), RSVP count, and a buffer.

### Target headcount and the no-show buffer

The buffer accounts for people who didn't RSVP but show up anyway (or the
reverse — people you want to make sure you have enough for). Two modes:

- **Percentage** — e.g. 20% on top of the RSVP count.
- **Flat** — a fixed number of extra people.

The result is the event's **target headcount**, shown at the top of the
event page and used as the default for every dish, drink, and supply unless
you override it individually.

## The meal plan

### Attaching a recipe

On an event page, pick a recipe from your library (or import/generate a new
one directly into the event) and a course. New dishes default to the
event's target headcount, rounded up to a whole number of pans/pots.

Each dish's summary line shows an estimated portion size ("&asymp; 5/8 cup
/ 2 1/2 oz per person") alongside its headcount — the dish's total known
ingredient weight and volume divided across however many people it's
scaled for. It's a rough gauge, not a plating instruction: ingredients
with no determinable weight or volume (a bare "3 eggs") aren't counted, so
it can undercount a dish that's mostly unweighable ingredients. Weight and
volume are computed independently and each can be missing on its own — a
canned vegetable counted by cans still gets a cup estimate (via its known
weight and typical density), a liquid with no matching density entry can
still get an oz-only estimate. Either figure disappears on its own if it
can't be determined, and the whole line disappears if neither can.

### Variants (allergen-free or modified batches)

A dish can have more than one **variant** — e.g. a "Standard" batch and a
"Gluten-free" batch of the same recipe, each with its own servings and its
own editable copy of the ingredients (so a variant can genuinely remove or
swap an ingredient, not just carry a note about it). Adding a new variant
takes its servings out of the dish's existing "Standard" variant, so the
dish's total headcount doesn't silently grow just because you split it.

### Sizing a dish by pan or pot instead of typing servings

Within a dish's edit panel, "Size by pan/pot instead of typing servings"
computes how many pans/pots of a chosen size you'd need to cover the
headcount you're currently working toward — always rounding up, so a dish
never ends up short. This is separate from the recipe-level vessel
rescaling: this one is about "how many pans do I need," not "what does one
pan make."

You can pick any pan or pot here, including switching between the two
families — say, moving a stovetop-pot recipe onto a steam table pan for
serving at a commercial kitchen. A footprint (square inches) and a capacity
(quarts) aren't on a comparable scale, so switching families asks you
directly how many people one of the new vessel feeds, rather than guessing
from an area ratio that wouldn't mean anything. Same-family switches (pot
to pot, pan to pan) still compute that automatically.

## Store-bought and catered items

Not everything is cooked from scratch — a store-bought dessert, a catering
order. Add these directly on the event page: a name, a course, and a plain
quantity note ("2 half-sheet cakes, feeds ~40"). There's no ingredient list
to maintain since there's nothing to scale — it just stays visible in the
meal plan and shows up in the shopping list's print view as a reminder to
buy or order it.

## Drinks

Planned separately from food, since "how many gallons of tea" is a
units-needed calculation, not an ingredient list.

### Adding a drink manually

Give it a name, how it's packaged (can, bottle, gallon jug, etc.), how many
ounces one person drinks, and how many people it's for. Leave the headcount
blank and it auto-splits the event's target headcount evenly with any other
drinks you haven't given a specific headcount to — so adding sweet tea,
unsweet tea, and lemonade doesn't suggest three full-headcount quantities.
Any drink you *do* give an explicit headcount to is honored exactly, and the
remainder splits across the rest.

### Suggesting a drink lineup with AI

"Suggest drinks with AI" takes a description of what you want (plus any
context that affects preference — region, event type: "tea and lemonade for
a Southern-style scout court of honor"), a headcount, and an oz-per-person
budget, and returns a specific lineup with a realistic split — sweet tea
weighted heavier than unsweet at a Southern event, for example, not an even
three-way split. Review and adjust the suggestions before saving; nothing
commits until you do.

## Supplies

Dinner plates, dessert plates, napkins, cups, forks, spoons, knives, and
ice — one-click presets at standard per-person multipliers (no AI involved
here, since these don't have the regional-preference ambiguity drinks do).
Plates are split into separate dinner and dessert line items rather than
one combined count, since a dessert plate is typically a different size.
Forks and spoons default to 2 per person, not 1 — someone eats their meal,
throws that one away, and gets a clean one for dessert; knives don't get
the same bump since dessert rarely needs one. Ice defaults to 1.5 lb per
person. Every preset is just a starting point — adjust the per-person
number or headcount on any added item, or add anything else entirely with
a custom name/unit/per-person amount.

## The menu

A guest-facing list of what's being served — just dish, drink, and
store-bought item names by course, with no quantities, ingredients, pan
sizes, or prep notes. Anything with more than one variant (e.g. a
gluten-free version of a dish) shows as "(also available: Gluten-Free)".
Has its own printable view, same as the cook's plan and shopping list, so
you can print or save it as a PDF to share with attendees without handing
them the kitchen's working documents.

## The cook's plan

The day-of answer to "what do I actually make" — distinct from the meal plan
(where you set things up) and the shopping list (what to buy). For each
dish, it shows:

- The recipe's **directions**, as written.
- How many pans/pots to make, and exactly how much of each ingredient goes
  into **each individual pan or pot** — "make 10 pans" on its own isn't
  actionable once you're standing at the counter; this tells you what goes
  in each one.

## The shopping list

Every ingredient across every dish, combined and summed (shared ingredients
across recipes are merged into one line), plus drinks, supplies, and
store-bought items to remember. Each ingredient shows both its
volume/count measurement and a gram/kilogram equivalent where it could be
determined. Items with no findable quantity ("salt to taste") are listed
separately, flagged for a manual check rather than silently dropped.

For any item that's actually sold that way — canned goods, or a dry bulk
staple like flour, sugar, or rice — a "Buy as" dropdown lets you convert it
to a foodservice/bulk package count instead of the consumer size: a #10
can, a #5 can, or a 5/10/25/50 lb bag. Useful if you're buying from a
warehouse club or restaurant supplier rather than a regular grocery store.
Picking a size shows "→ buy N #10 cans" (always rounded up) right next to
the item. The dropdown itself only appears on the interactive page (there's
nothing to click on paper), but whatever you picked sticks — it's saved in
your browser, so it's still applied if you edit something else on the page,
reload, or open the printable/PDF view, where the converted "→ buy N" text
prints right along with everything else.

## Printing

The menu, cook's plan, and shopping list all display inline on the event
page — you don't have to leave it just to see them. Each also has an "Open
printable view" link to a dedicated, single-purpose page for actually
printing: cleaner layout, nothing else on the page. You control when it
prints — nothing opens a print dialog automatically. Your browser's print
dialog has a "Save as PDF" destination, so the same printable views work
for exporting a PDF, not just printing on paper.

## How scaling and rounding work

A few rules apply everywhere in the app, worth understanding once:

- **Whole, purchasable, or usable units always round up.** Pans, pots, cans,
  packages, drink units, and genuinely whole-count ingredients (eggs,
  chicken breasts) round up to the next whole number — never to nearest,
  never down. You never end up short by a fraction of a pan or a fraction of
  a can.
- **A can of soup isn't the same as a chicken breast.** Divisible
  quantities — a can, a box, a cup, a tablespoon — scale fractionally, since
  you can use however much a recipe calls for (1 1/2 cans) even though you'd
  only ever *buy* whole ones. Only genuinely whole/indivisible items round.
- **"How much to use" and "how much to buy" are different questions.** A
  recipe or the cook's plan can call for 1 1/2 cans of something; the
  shopping list is where "how many do I need to buy" (2) would apply.
- **Nothing is ever maxed out just because a vessel is bigger.** A 12-quart
  pot doesn't mean a recipe has to make 12-14 cups of rice — it means that's
  the ceiling. A dish is sized to the headcount you're actually feeding, not
  to fill whatever vessel happens to be chosen.
- **Every suggestion is a starting point, not a decision.** Portion
  estimates, drink splits, and vessel suggestions are all shown in place and
  fully editable — the app never silently locks in a number you can't see or
  change.

## Troubleshooting

- **AI features (Generate with AI, Suggest drinks, revising a recipe) say
  they're not set up.** Open **Settings** in the top nav and paste in an
  [Anthropic API key](https://console.anthropic.com/settings/keys) — it
  saves to the app's own database and works immediately, no file editing or
  restart needed. (You can also set `ANTHROPIC_API_KEY` in `.env.local`
  instead if you'd rather — a key pasted into Settings takes priority over
  it either way.) Everything else in the app works fine without one —
  importing, scaling, shopping lists, supplies, and manually-entered drinks
  don't need it.
- **A URL import fails or gets blocked.** Paste the page's HTML source
  (view-source) or just its visible recipe text instead — the same paste box
  handles all three.
- **A recipe's pan/pot size looks wrong after editing servings by hand.**
  Editing servings directly doesn't rescale ingredients or check the vessel
  for you — that's what the vessel-change prompt and the "I actually want to
  cook this in a different pan/pot" tool are for. If you've hand-edited
  things into an inconsistent state, the easiest fix is usually to pick a
  vessel again (even the same one) to trigger the check, or delete and
  regenerate/re-import.
