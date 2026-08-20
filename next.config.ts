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
};

export default nextConfig;
