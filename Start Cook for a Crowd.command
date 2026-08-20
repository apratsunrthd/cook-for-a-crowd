#!/bin/bash
# Double-click this file (or run it from Terminal) to start Cook for a
# Crowd and open it in your browser. Closing this window stops the app.
set -e
cd "$(dirname "$0")"

echo "🍲 Cook for a Crowd"
echo ""

# First run on this machine: install dependencies. Every run after this
# one skips straight past, since node_modules already exists.
if [ ! -d node_modules ]; then
  echo "Setting up for the first time -- this can take a minute..."
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

npm run dev &
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
