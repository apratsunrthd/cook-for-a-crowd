#!/bin/bash
# Run this to start Cook for a Crowd via Docker and open it in your
# browser. Needs Docker installed: https://docs.docker.com/engine/install/
#
# Unlike the macOS launcher, this keeps running in the background (as a
# Docker container) even after this script exits or the terminal closes --
# run stop-cook-for-a-crowd.sh (or `docker compose down`) to stop it.
set -e
cd "$(dirname "$0")"

echo "🍲 Cook for a Crowd"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker isn't installed. See https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker doesn't seem to be running -- start it and try again."
  exit 1
fi

# First run: create a local settings file so there's somewhere to add an
# API key later. The app works fine without one -- only "Generate with
# AI" needs it -- so this is never required to get started.
if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
fi

if curl -s -o /dev/null http://localhost:3000; then
  echo "Already running -- opening in your browser."
else
  echo "Starting up -- this can take a minute the first time..."
  # --wait blocks until the container reports healthy (see the
  # healthcheck in docker-compose.yml) rather than needing our own
  # readiness-polling loop here.
  docker compose up -d --build --wait
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://localhost:3000 >/dev/null 2>&1
else
  echo "Open http://localhost:3000 in your browser."
fi

echo ""
echo "Cook for a Crowd is running at http://localhost:3000"
echo "It keeps running in the background (via Docker), even after this"
echo "terminal closes. To stop it: ./stop-cook-for-a-crowd.sh"
echo ""
