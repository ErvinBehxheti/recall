"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { SpeakerIcon, StopIcon } from "@/components/Icons";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";

const noSubscription = () => () => {};

/** Reads `text` with the browser's voice. Hidden where speech is unavailable; stops when it unmounts. */
export function ReadAloudButton({ text }: { text: string }) {
  const supported = useSyncExternalStore(noSubscription, canSpeak, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(text, () => setSpeaking(false));
    }
  }

  return (
    <Button variant="quiet" onClick={toggle}>
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      {speaking ? "Stop reading" : "Read aloud"}
    </Button>
  );
}
