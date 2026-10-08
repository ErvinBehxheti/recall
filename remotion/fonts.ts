// remotion/fonts.ts
// next/font does not exist in Remotion, so load the same two families here and expose them under
// the CSS variables the app's theme (src/app/globals.css) already reads.
import { loadFont as loadAtkinson } from "@remotion/google-fonts/AtkinsonHyperlegibleNext";
import { loadFont as loadLiterata } from "@remotion/google-fonts/Literata";

const literata = loadLiterata("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });
const atkinson = loadAtkinson("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

document.documentElement.style.setProperty("--font-literata", literata.fontFamily);
document.documentElement.style.setProperty("--font-atkinson", atkinson.fontFamily);
