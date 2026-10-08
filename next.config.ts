import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The promo video capture (npm run video:capture) runs its own dev server next to the normal one,
  // and Next allows one dev server per build folder. Unset, this is the usual .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
