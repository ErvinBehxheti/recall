import type { Card } from "./lesson-schema";

const PREFERRED = /natural|neural|google|aria|jenny|guy|samantha|daniel/i;
const end = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function pickVoice(voices: Pick<SpeechSynthesisVoice, "name" | "lang">[], lang = "en"): number {
  const matching = voices.map((v, i) => ({ v, i })).filter(({ v }) => v.lang.toLowerCase().startsWith(lang));
  return (matching.find(({ v }) => PREFERRED.test(v.name)) ?? matching[0])?.i ?? -1;
}

export function cardSpeechText(card: Card): string {
  return [end(card.title), card.explanation, ...card.keyPoints.map(end), `Remember this: ${card.rememberThis}`].join(" ");
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** English keeps the old behavior. Other languages need an installed voice, so the button hides without one. */
export function voiceAvailable(lang: string): boolean {
  if (!canSpeak()) return false;
  if (lang === "en") return true;
  return pickVoice(window.speechSynthesis.getVoices(), lang) >= 0;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

const LANG_TAG: Record<string, string> = { en: "en-US", sq: "sq-AL" };

export function speak(text: string, onEnd: () => void, lang = "en"): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const index = pickVoice(voices, lang);
  if (index >= 0) utterance.voice = voices[index];
  utterance.lang = LANG_TAG[lang] ?? lang;
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
}
