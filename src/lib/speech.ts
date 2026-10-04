import type { Card } from "./lesson-schema";

const PREFERRED = /natural|neural|google|aria|jenny|guy|samantha|daniel/i;
const end = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function pickVoice(voices: Pick<SpeechSynthesisVoice, "name" | "lang">[]): number {
  const english = voices.map((v, i) => ({ v, i })).filter(({ v }) => v.lang.toLowerCase().startsWith("en"));
  return (english.find(({ v }) => PREFERRED.test(v.name)) ?? english[0])?.i ?? -1;
}

export function cardSpeechText(card: Card): string {
  return [end(card.title), card.explanation, ...card.keyPoints.map(end), `Remember this: ${card.rememberThis}`].join(" ");
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speak(text: string, onEnd: () => void): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const index = pickVoice(voices);
  if (index >= 0) utterance.voice = voices[index];
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
}
