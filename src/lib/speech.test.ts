import { describe, expect, it } from "vitest";
import { cardSpeechText, pickVoice } from "./speech";
import { makeLesson } from "./test-fixtures";

describe("pickVoice", () => {
  it("prefers natural-sounding English voices, then any English voice", () => {
    const voices = [
      { name: "Microsoft Hedda", lang: "de-DE" },
      { name: "Microsoft David", lang: "en-US" },
      { name: "Microsoft Aria Online (Natural)", lang: "en-US" },
    ];
    expect(pickVoice(voices)).toBe(2);
    expect(pickVoice(voices.slice(0, 2))).toBe(1);
    expect(pickVoice([{ name: "Hedda", lang: "de-DE" }])).toBe(-1);
  });
});

describe("cardSpeechText", () => {
  it("reads title, explanation, key points and the remember line in order", () => {
    const card = makeLesson().cards[0];
    expect(cardSpeechText(card)).toBe(
      "Topic 1. This is the explanation for topic 1. It has two sentences. Point A1. Point B1. Remember this: Remember topic 1.",
    );
  });
});
