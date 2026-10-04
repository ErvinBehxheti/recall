// Emoji and pictographs, except the copyright, registered and trademark signs.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}|[‍️⃣]/gu;

export function sanitizeText(input: string): string {
  return input
    .replace(EMOJI, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+–\s+/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,\s]+/, "")
    .trim();
}
