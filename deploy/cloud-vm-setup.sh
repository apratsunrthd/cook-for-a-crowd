#!/bin/bash
# Startup script for a fresh Ubuntu VM (GCP Compute Engine's
# "startup-script" metadata, or AWS EC2's "user data") -- installs
# Docker, gets this repo onto the VM, and starts the app the same way
# the local Docker launchers do. See "Deploying to the cloud" in
# README.md for the full walkthrough, including the security warning you
# should read before running this anywhere with a public IP.
#
# Re-running this (e.g. because the VM rebooted) is safe -- each step
# only does something if it hasn't already been done.
set -e

REPO_URL="${REPO_URL:-https://github.com/apratsunrthd/cook-for-a-crowd.git}"
APP_DIR="/opt/cook-for-a-crowd"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local -- SSH in and add your ANTHROPIC_API_KEY (optional)"
  echo "and, if you're putting this anywhere public, DOMAIN/BASIC_AUTH_USER/"
  echo "BASIC_AUTH_HASH (see README.md) before it's actually reachable."
fi

# Starts without the proxy profile by default -- deliberately: this repo
# has no login of its own, so app:3000 alone (bound to localhost only,
# see docker-compose.yml) is the safe default until you've actually set
# up the Caddy proxy's auth. Re-run this same command with
# `--profile proxy` once that's configured.
docker compose up -d --build --wait
