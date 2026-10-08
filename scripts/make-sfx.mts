// scripts/make-sfx.mts
// Builds out/sfx.wav, the sound design for the promo video, from the cue list in remotion/sfx-cues.ts.
// Everything is synthesized here (scripts/sfx-synth.ts); scripts/finalize-video.sh mixes it into the video with ffmpeg.
import { mkdirSync, writeFileSync } from "node:fs";
import { buildCues, checkCues } from "../remotion/sfx-cues";
import { DURATION, FPS } from "../remotion/timing";
import { SR, voice } from "./sfx-synth";

const OUT = "out/sfx.wav";
const PEAK = 0.8; // about -2 dBFS: loud enough to hear in a hall, with room left for music

const cues = buildCues();
checkCues(cues);

const total = Math.round((DURATION / FPS) * SR);
const left = new Float32Array(total);
const right = new Float32Array(total);

for (const cue of cues) {
  const sound = voice(cue, cue.frame * 7 + 1);
  const start = Math.round((cue.frame / FPS) * SR);
  const angle = ((cue.pan ?? 0) + 1) * (Math.PI / 4); // equal-power pan
  const gl = Math.cos(angle) * cue.gain * Math.SQRT2;
  const gr = Math.sin(angle) * cue.gain * Math.SQRT2;
  for (let i = 0; i < sound.length && start + i < total; i++) {
    left[start + i] += sound[i] * gl;
    right[start + i] += sound[i] * gr;
  }
}

let peak = 0;
for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const scale = peak > PEAK ? PEAK / peak : 1;

// 16-bit stereo WAV.
const data = Buffer.alloc(total * 4);
for (let i = 0; i < total; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * scale)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * scale)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(2, 22); // stereo
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

mkdirSync("out", { recursive: true });
writeFileSync(OUT, Buffer.concat([header, data]));
writeFileSync("out/sfx-cues.json", JSON.stringify(cues, null, 2));

const byVoice = new Map<string, number>();
for (const cue of cues) byVoice.set(cue.voice, (byVoice.get(cue.voice) ?? 0) + 1);
console.log(`${cues.length} cues (${[...byVoice].map(([v, n]) => `${v} ${n}`).join(", ")})`);
console.log(`peak before scaling ${peak.toFixed(2)}, scaled by ${scale.toFixed(2)} to ${PEAK}`);
console.log(`wrote ${OUT} (${(total / SR).toFixed(1)}s)`);
