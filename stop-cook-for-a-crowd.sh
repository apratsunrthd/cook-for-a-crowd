#!/bin/bash
# Stops the Cook for a Crowd container started by start-cook-for-a-crowd.sh.
# Your data stays put -- it lives in ./data on the host, not inside the
# container, so stopping (or even deleting) the container never touches it.
set -e
cd "$(dirname "$0")"
docker compose down
echo "Stopped."
