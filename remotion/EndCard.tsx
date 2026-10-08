// remotion/EndCard.tsx
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { Wordmark } from "@/components/Wordmark";
import { ramp } from "./ease";
import { END } from "./events";
import { COLORS } from "./layout";
import { PRESENTERS } from "./timing";

const SUBJECTS = "Biology, Chemistry, Math, Albanian, English";

/** The last frame of the video, and the closing stage screen. Pass a late frame to see it fully drawn. */
export function EndCard({ frame }: { frame: number }) {
  if (frame < END.from) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.paper,
        opacity: ramp(frame, END.from, END.from + 28),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        color: COLORS.ink,
      }}
    >
      <div style={{ height: 230, display: "flex", alignItems: "center" }}>
        <div style={{ transform: "scale(2.5)" }}>
          <Wordmark size="lg" highlightProgress={ramp(frame, ...END.wordmark)} />
        </div>
      </div>
      <p className="font-serif font-semibold" style={{ fontSize: 88, opacity: ramp(frame, 2172, 2184) }}>
        Any slides. <HighlightSwipe progress={ramp(frame, ...END.subject)}>Any subject.</HighlightSwipe>
      </p>
      <p style={{ fontSize: 56, color: COLORS.inkSoft, opacity: ramp(frame, 2192, 2204) }}>{SUBJECTS}</p>
      <p style={{ fontSize: 56, marginTop: 28, opacity: ramp(frame, 2206, 2218) }}>Made by {PRESENTERS}, age 14.</p>
    </div>
  );
}
