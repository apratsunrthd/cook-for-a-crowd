import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo's CLAUDE.md carries required gstack bootstrap instructions --
  // don't let `next dev` auto-append unrelated agent guidance to it.
  agentRules: false,
  // The floating "N" dev-tools badge is meant for active development, not
  // for someone just using the app -- this is a local tool run via a
  // double-click launcher, not a codebase being actively debugged in a
  // browser tab all day.
  devIndicators: false,
  // Produces a self-contained .next/standalone/ build (server.js + only
  // the node_modules it actually needs, file-traced) -- the Docker image
  // copies that instead of the full node_modules, keeping the runtime
  // image small. Only turned on for the Docker build (see the Dockerfile,
  // which sets DOCKER_BUILD before `npm run build`): verified directly
  // that `output: "standalone"` breaks the native launcher's `next
  // start` outright ("does not work with output: standalone -- use node
  // .next/standalone/server.js instead"), so it can't just be always-on.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
