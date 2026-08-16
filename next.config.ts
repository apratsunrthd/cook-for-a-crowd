import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo's CLAUDE.md carries required gstack bootstrap instructions --
  // don't let `next dev` auto-append unrelated agent guidance to it.
  agentRules: false,
};

export default nextConfig;
