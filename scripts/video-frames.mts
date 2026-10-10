// scripts/video-frames.mts
// Renders chosen frames of the promo to out/frames/ with one bundle, so a whole storyboard can be checked in a minute.
// Usage: npm run video:frames -- 100 250 330     (or: npm run video:frames -- all   for one frame per second)
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../remotion/webpack";

const args = process.argv.slice(2);
const frames =
  args[0] === "all" ? Array.from({ length: 150 }, (_, i) => i * 30) : args.map(Number).filter((n) => Number.isInteger(n) && n >= 0);
if (frames.length === 0) throw new Error("Give frame numbers, or 'all'.");

mkdirSync("out/frames", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("remotion/index.ts"), webpackOverride });
const composition = await selectComposition({ serveUrl, id: "Promo" });
for (const frame of frames) {
  const output = `out/frames/f${String(frame).padStart(4, "0")}.png`;
  await renderStill({ composition, serveUrl, frame, output });
  console.log(output);
}
