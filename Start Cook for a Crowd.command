#!/bin/bash
# Double-click this file (or run it from Terminal) to start Cook for a
# Crowd and open it in your browser. Closing this window stops the app.
#
# Runs a production build rather than the dev server -- faster once
# running, and a broken change fails loudly here (before the app ever
# starts) instead of surfacing as a broken page later. The tradeoff is a
# rebuild step, which this script only pays when the code actually
# changed since the last build (see NEEDS_BUILD below), so an ordinary
# run with no code changes starts immediately.
set -e
cd "$(dirname "$0")"

echo "🍲 Cook for a Crowd"
echo ""

# Install dependencies the first time, or whenever package-lock.json has
# changed more recently than the last install (e.g. after pulling in a
# change that added a dependency). node_modules/.package-lock.json is
# npm's own marker for "what I last installed from" -- comparing against
# it means a missing node_modules (-nt against a nonexistent file is
# true) and a stale one are both handled by the same check.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Installing dependencies -- this can take a minute..."
  npm install
  echo ""
fi

# First run: create a local settings file so there's somewhere to add an
# API key later. The app works fine without one -- only "Generate with
# AI" needs it -- so this is never required to get started.
if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
fi

# Already running (e.g. from an earlier double-click you never closed)?
# Just open it instead of trying to start a second copy.
if curl -s -o /dev/null http://localhost:3000; then
  echo "Already running -- opening in your browser."
  open http://localhost:3000
  exit 0
fi

# Rebuild only if the code has actually changed since the last build --
# `next build` regenerates .next/BUILD_ID every time, so its timestamp is
# a ready-made "last built at" marker to compare source files against.
NEEDS_BUILD=0
if [ ! -f .next/BUILD_ID ]; then
  NEEDS_BUILD=1
elif find app components lib next.config.ts package.json package-lock.json tsconfig.json postcss.config.mjs \
    -newer .next/BUILD_ID -type f 2>/dev/null | grep -q .; then
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" = "1" ]; then
  echo "Code has changed since the last run -- building (a few seconds)..."
  if ! npm run build; then
    echo ""
    echo "Build failed -- see the error above. Fix it before the app can start."
    exit 1
  fi
  echo ""
fi

npm start &
DEV_PID=$!

echo "Starting up..."
for _ in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:3000; then
    open http://localhost:3000
    break
  fi
  sleep 1
done

echo ""
echo "Cook for a Crowd is running at http://localhost:3000"
echo "Keep this window open while you're using it -- closing it (or"
echo "pressing Ctrl+C) stops the app."
echo ""

wait "$DEV_PID"
