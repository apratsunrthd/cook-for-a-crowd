#!/bin/bash
# Prints a BASIC_AUTH_HASH line ready to paste into .env.local, for the
# optional Caddy reverse proxy (see "Deploying to the cloud" in
# README.md). Uses the same Caddy image the proxy container itself runs,
# so it doesn't matter whether `caddy` is installed on your machine.
#
# Usage: ./deploy/generate-basic-auth-password.sh <password>
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <password>"
  exit 1
fi

HASH=$(docker run --rm caddy:2 caddy hash-password --plaintext "$1")

# Every $ has to be doubled to $$ before it goes in .env.local -- Docker
# Compose interpolates $-sequences in env_file values, and a bcrypt hash
# is nothing but $-delimited segments. Skipping this silently truncates
# the hash at the first $ Compose can't resolve as a variable, which
# fails "successfully" (a 401 with no obvious cause) rather than erroring
# -- verified this directly while building the Caddy setup.
ESCAPED_HASH=$(printf '%s' "$HASH" | sed 's/\$/$$/g')

echo ""
echo "Add this line to .env.local:"
echo ""
echo "BASIC_AUTH_HASH=$ESCAPED_HASH"
echo ""
