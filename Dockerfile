# Builds and runs Cook for a Crowd the same way on any OS Docker runs on --
# the point of this file is specifically to sidestep better-sqlite3's
# native-addon compile step, which is the actual cross-platform pain point
# (especially on Windows). The native module compiles once, inside this
# image, against this image's own Node/libc -- nobody running the
# container needs a C/C++ toolchain on their own machine at all.
#
# Debian slim, not Alpine: Alpine's musl libc is a real source of prebuilt
# native-addon mismatches, and image size isn't the priority for a
# personal single-user tool -- correctness is.
#
# Node 22, not 20: verified directly -- better-sqlite3 v13's bundled
# linux-arm64 prebuild segfaults immediately (before any app code runs) on
# Node 20 in this exact base image, and works fine on Node 22. Confirmed
# it's specifically a Node-version thing, not a Debian/Alpine/arch thing,
# by testing the same prebuild across several base images.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DOCKER_BUILD gates `output: "standalone"` in next.config.ts -- it breaks
# the native (non-Docker) launcher's `next start`, so it's opt-in per build
# rather than always-on.
ENV DOCKER_BUILD=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone output's file tracing only follows what's require()'d, so
# it can't know lib/db.ts reads *.sql files from lib/migrations at runtime
# by constructing a path at runtime -- copied in explicitly, same reason
# the data/ directory (the SQLite file's home, volume-mounted at run time)
# needs to exist and be writable by the non-root user up front.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/lib/migrations ./lib/migrations
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Docker auto-sets HOSTNAME to the container ID for every container, and
# the standalone server.js does `process.env.HOSTNAME || '0.0.0.0'` --
# so without this override it binds to that container-ID string instead
# of every interface, and the in-container healthcheck (connecting to
# plain localhost) gets ECONNREFUSED even though the port mapping to the
# host still happens to work. Verified directly: `docker exec ... node -e
# "require('http').get('http://localhost:3000/', ...)"` failed with
# ECONNREFUSED before this fix, succeeded after.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
