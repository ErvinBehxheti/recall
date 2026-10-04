import { BRAND } from "@/config/brand";
import { HighlightSwipe } from "./HighlightSwipe";

type Props = { highlightProgress?: number; size?: "sm" | "lg" };

/** The product name with the highlighter behind its last four letters. */
export function Wordmark({ highlightProgress = 1, size = "sm" }: Props) {
  const head = BRAND.name.slice(0, -4);
  const tail = BRAND.name.slice(-4);
  const text = size === "lg" ? "text-[clamp(3rem,9vw,6rem)]" : "text-[1.375rem]";
  return (
    <span className={`font-serif font-semibold tracking-[-0.01em] text-ink ${text}`}>
      {head}
      <HighlightSwipe progress={highlightProgress}>{tail}</HighlightSwipe>
    </span>
  );
}
