"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { SpeakerIcon, StopIcon } from "@/components/Icons";
import { canSpeak, speak, stopSpeaking, voiceAvailable } from "@/lib/speech";

// Browsers load voices late, so listen for them to appear.
function subscribeVoices(onChange: () => void) {
  if (!canSpeak()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Reads `text` with the browser's voice. Hidden where there is no voice for `lang`; stops when it unmounts. */
export function ReadAloudButton({ text, lang = "en" }: { text: string; lang?: string }) {
  const supported = useSyncExternalStore(subscribeVoices, () => voiceAvailable(lang), () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(text, () => setSpeaking(false), lang);
    }
  }

  return (
    <Button variant="quiet" onClick={toggle}>
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      {speaking ? "Stop reading" : "Read aloud"}
    </Button>
  );
}
