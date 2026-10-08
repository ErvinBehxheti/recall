// remotion/webpack.ts
// Shared by remotion.config.ts (CLI renders) and scripts/video-frames.mts (many stills in one bundle).
import path from "node:path";
import { enableTailwind } from "@remotion/tailwind-v4";
import type { WebpackOverrideFn } from "@remotion/bundler";

/** The app's display components import from "@/..."; point that at src/ and let Tailwind scan them. */
export const webpackOverride: WebpackOverrideFn = (config) => {
  const withTailwind = enableTailwind(config);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: { ...(withTailwind.resolve?.alias ?? {}), "@": path.resolve("src") },
    },
  };
};
