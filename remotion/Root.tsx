import "./fonts";
import "./video.css";
import { Composition, Still } from "remotion";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { Wordmark } from "@/components/Wordmark";
import { BRAND } from "@/config/brand";
import { EndCard } from "./EndCard";
import { COLORS } from "./layout";
import { Promo } from "./Promo";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timing";

/** Opening stage screen: the name and the promise, before the video starts. */
const StageOpen = () => {
  const at = BRAND.tagline.indexOf("Lesson");
  return (
    <div style={{ width: WIDTH, height: HEIGHT, background: COLORS.paper, color: COLORS.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 90 }}>
      <div style={{ transform: "scale(3)", height: 180, display: "flex", alignItems: "center" }}>
        <Wordmark size="lg" highlightProgress={1} />
      </div>
      <p className="font-serif font-semibold" style={{ fontSize: 96 }}>
        {BRAND.tagline.slice(0, at)}
        <HighlightSwipe progress={1}>{BRAND.tagline.slice(at)}</HighlightSwipe>
      </p>
    </div>
  );
};

/** Closing stage screen: the video's end card, fully drawn. */
const StageClose = () => (
  <div style={{ width: WIDTH, height: HEIGHT, position: "relative" }}>
    <EndCard frame={DURATION} />
  </div>
);

export const Root = () => (
  <>
    <Composition id="Promo" component={Promo} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={DURATION} />
    <Still id="StageOpen" component={StageOpen} width={WIDTH} height={HEIGHT} />
    <Still id="StageClose" component={StageClose} width={WIDTH} height={HEIGHT} />
  </>
);
