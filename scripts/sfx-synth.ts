// scripts/sfx-synth.ts
// The sounds themselves, built from sine waves and filtered noise. No samples, nothing downloaded.
// Every voice returns mono samples at 48 kHz with a peak of 0.9; the cue's gain sets how loud it is in the mix.
import type { Cue } from "../remotion/sfx-cues";
import { mulberry32 } from "../src/lib/random";

export const SR = 48_000;
const TAU = Math.PI * 2;

const samples = (seconds: number) => Math.max(1, Math.round(seconds * SR));

function whiteNoise(n: number, seed: number): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** Band-pass filter with constant peak gain. `f` can move over time (seconds). */
function bandpass(x: Float32Array, f: number | ((t: number) => number), q: number): Float32Array {
  const y = new Float32Array(x.length);
  let x2 = 0;
  let x1 = 0;
  let y2 = 0;
  let y1 = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(typeof f === "number" ? f : f(i / SR), SR * 0.45);
    const w0 = (TAU * fc) / SR;
    const alpha = Math.sin(w0) / (2 * q);
    const out = (alpha * (x[i] - x2) + 2 * Math.cos(w0) * y1 - (1 - alpha) * y2) / (1 + alpha);
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = out;
    y[i] = out;
  }
  return y;
}

function lowpass(x: Float32Array, fc: number): Float32Array {
  const a = Math.exp((-TAU * fc) / SR);
  const y = new Float32Array(x.length);
  let state = 0;
  for (let i = 0; i < x.length; i++) {
    state += (1 - a) * (x[i] - state);
    y[i] = state;
  }
  return y;
}

/** Scales so the loudest sample is `peak`. */
function norm(x: Float32Array, peak = 1): Float32Array {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  const out = new Float32Array(x.length);
  if (max === 0) return out;
  const k = peak / max;
  for (let i = 0; i < x.length; i++) out[i] = x[i] * k;
  return out;
}

function build(seconds: number, fn: (t: number, i: number) => number): Float32Array {
  const out = new Float32Array(samples(seconds));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
}

/** A hair of fade at both ends so no sound starts or stops with a click, then a fixed peak. */
function finish(x: Float32Array): Float32Array {
  const fadeIn = Math.round(0.0005 * SR);
  const fadeOut = Math.min(x.length, Math.round(0.01 * SR));
  for (let i = 0; i < fadeIn && i < x.length; i++) x[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) x[x.length - 1 - i] *= i / fadeOut;
  return norm(x, 0.9);
}

/** One sound for one cue. `seed` keeps the noise different from cue to cue but the same on every run. */
export function voice(cue: Cue, seed: number): Float32Array {
  const d = cue.seconds ?? 0.5;
  switch (cue.voice) {
    case "land": {
      // A sheet of paper dropping onto a pile: a low thump and a short snap.
      const f0 = 105 + (cue.variant ?? 0) * 14;
      const snap = bandpass(whiteNoise(samples(0.16), seed), 2200, 0.9);
      return finish(build(0.16, (t, i) => Math.sin(TAU * (f0 * t - 110 * t * t)) * Math.exp(-t * 55) * 0.85 + snap[i] * Math.exp(-t * 150) * 0.55));
    }
    case "slam": {
      // A heavy, short, low hit with a little air on top.
      const n = samples(0.6);
      const body = lowpass(whiteNoise(n, seed), 900);
      const click = bandpass(whiteNoise(n, seed + 1), 3000, 1);
      return finish(
        build(0.6, (t, i) => {
          const phase = TAU * (55 * t + (60 * (1 - Math.exp(-18 * t))) / 18);
          return Math.sin(phase) * Math.exp(-t * 10) * (1 - Math.exp(-t * 700)) * 0.9 + body[i] * Math.exp(-t * 35) * 0.5 + click[i] * Math.exp(-t * 400) * 0.3;
        }),
      );
    }
    case "sweep": {
      // Filtered air that rises in pitch and swells, like a marker pulled across the whole page.
      const n = samples(d);
      const air = norm(bandpass(whiteNoise(n, seed), (t) => 500 * Math.pow(9, Math.min(t / d, 1)), 3.5));
      return finish(
        build(d, (t, i) => {
          const bell = Math.pow(Math.sin(Math.PI * Math.min(t / d, 1)), 1.6);
          return (air[i] + Math.sin(TAU * (220 * t + (700 / (2 * d)) * t * t)) * 0.18) * bell;
        }),
      );
    }
    case "riser": {
      // Tension: low rumble and a rising tone that get louder until the wipe.
      const n = samples(d);
      const rumble = norm(bandpass(whiteNoise(n, seed), (t) => 150 * Math.pow(20, t / d), 0.5));
      return finish(
        build(d, (t, i) => {
          const amp = Math.pow(t / d, 2.2);
          return (rumble[i] * 0.7 + Math.sin(TAU * (60 * t + (200 / (2 * d)) * t * t)) * 0.5) * amp;
        }),
      );
    }
    case "scritch": {
      // A marker on paper: band-passed noise whose strength wanders like a hand.
      const n = samples(d);
      const grain = norm(bandpass(whiteNoise(n, seed), 3300, 0.9));
      const hand = norm(lowpass(whiteNoise(n, seed + 7), 14));
      return finish(build(d, (t, i) => grain[i] * (0.62 + 0.38 * hand[i]) * Math.min(t / 0.025, 1) * Math.max(Math.min((d - t) / 0.07, 1), 0)));
    }
    case "tick": {
      const f = cue.pitch ?? 1000;
      const click = norm(bandpass(whiteNoise(samples(0.07), seed), 5000, 1.2));
      return finish(build(0.07, (t, i) => Math.sin(TAU * f * t) * Math.exp(-t * 260) * 0.7 + click[i] * Math.exp(-t * 1100) * 0.8));
    }
    case "key": {
      const click = norm(bandpass(whiteNoise(samples(0.06), seed), 1700, 1));
      return finish(build(0.06, (t, i) => click[i] * Math.exp(-t * 380) * 0.8 + Math.sin(TAU * 520 * t) * Math.exp(-t * 260) * 0.4));
    }
    case "thock": {
      const air = norm(bandpass(whiteNoise(samples(0.14), seed), 1100, 1));
      return finish(build(0.14, (t, i) => Math.sin(TAU * (210 * t - 300 * t * t)) * Math.exp(-t * 45) * 0.8 + air[i] * Math.exp(-t * 160) * 0.35));
    }
    case "whoosh": {
      // Air moving: the camera speeds up and slows down, so the sound rises and falls with it.
      const n = samples(d);
      const reach = cue.big ? 1500 : 700;
      const air = norm(bandpass(whiteNoise(n, seed), (t) => 600 + reach * Math.sin(Math.PI * Math.min(t / d, 1)), 0.8));
      return finish(
        build(d, (t, i) => {
          const bell = Math.pow(Math.sin(Math.PI * Math.min(t / d, 1)), 2);
          const sub = cue.big ? Math.sin(TAU * (110 * t - (50 * t * t) / d)) * 0.5 : 0;
          return (air[i] + sub) * bell;
        }),
      );
    }
    case "wrong": {
      // A soft low thud that sinks in pitch. Gentle, not a buzzer.
      const low = norm(lowpass(whiteNoise(samples(0.55), seed), 400));
      return finish(
        build(0.55, (t, i) => {
          const phase = TAU * (120 * t - 70 * (t - (1 - Math.exp(-5 * t)) / 5));
          return Math.sin(phase) * Math.exp(-t * 7) * (1 - Math.exp(-t * 400)) * 0.9 + low[i] * Math.exp(-t * 20) * 0.3;
        }),
      );
    }
    case "swell": {
      const n = samples(d);
      const air = norm(bandpass(whiteNoise(n, seed), (t) => 400 + 800 * Math.min(t / d, 1), 0.7));
      return finish(build(d, (t, i) => air[i] * Math.pow(Math.sin(Math.PI * Math.min(t / d, 1)), 1.5)));
    }
    case "resolve": {
      // Three low notes, an open fifth, fading over a couple of seconds.
      const partials: [number, number][] = [
        [98, 1],
        [147, 0.6],
        [196, 0.35],
      ];
      return finish(build(2.6, (t) => partials.reduce((sum, [f, a]) => sum + Math.sin(TAU * f * t) * a, 0) * Math.exp(-t * 1.6) * (1 - Math.exp(-t * 40))));
    }
  }
}
