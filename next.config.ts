import type { NextConfig } from "next";

/**
 * Dev-only rewrite to the local Python runner (scripts/dev_wholesale.py on :8001).
 *
 * Guarantee this is off in production:
 * 1. `process.env.NODE_ENV === "development"` — Next sets NODE_ENV=production for
 *    `next build` / `next start` / Vercel production & preview builds.
 * 2. AND `POWERSAVE_DEV_REWRITE=1` — only set by scripts/dev.sh, never on Vercel.
 *
 * Both must be true. A production build therefore gets `rewrites: []`.
 */
const enableDevWholesaleRewrite =
  process.env.NODE_ENV === "development" && process.env.POWERSAVE_DEV_REWRITE === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!enableDevWholesaleRewrite) {
      return [];
    }
    return [
      {
        source: "/api/wholesale",
        destination: "http://127.0.0.1:8001/api/wholesale",
      },
    ];
  },
};

export default nextConfig;
