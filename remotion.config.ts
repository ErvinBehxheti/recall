// remotion.config.ts
import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./remotion/webpack";

// PNG frames and BT.709 give a normal limited-range yuv420p video. JPEG frames come out as full-range
// yuvj420p, which some venue players and slide programs show with washed-out or clipped colours.
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCodec("h264");
Config.setCrf(16);
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(webpackOverride);
