// remotion/Promo.tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { Desk } from "./Desk";
import { EndCard } from "./EndCard";
import { Band, Chaos, Opening, WIPE_FROM, WIPE_TO, wipeEdge } from "./Hook";
import { COLORS } from "./layout";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Layers, bottom to top: the desk (clipped to the left of the highlighter while it sweeps), the pile of slides
 * (clipped to the right of it), the highlighter, the name, captions, and the end card.
 */
export const Promo = () => {
  const frame = useCurrentFrame();
  const sweeping = frame < WIPE_TO + 6;
  const edge = wipeEdge(frame);
  return (
    <AbsoluteFill style={{ background: COLORS.desk }}>
      {frame >= WIPE_FROM - 3 && (
        <div style={{ position: "absolute", inset: 0, clipPath: sweeping ? `inset(0 ${clamp(1920 - edge, 0, 1920)}px 0 0)` : undefined }}>
          <Desk frame={frame} />
        </div>
      )}
      {sweeping && <Chaos frame={frame} />}
      <Band frame={frame} />
      <Opening frame={frame} />
      <Caption frame={frame} />
      <EndCard frame={frame} />
    </AbsoluteFill>
  );
};
