# Slidekick promo video (Plan 2): "The Study Desk"

## Context

The students present Slidekick on **Saturday 2026-10-10** in a 4-minute slot. The app is now v2 (teacher and student accounts, join-code classes, five subjects, teacher-edited private quizzes, real results), but the only video storyboard (spec section 11) was written for the v1 MVP. The user wants a video that sells this as a real product, not an MVP, with a "crazy wow" moment, built with Remotion and ffmpeg, and built in about one hour.

What you said: length is my call, plan the motion and the audience hook, wow effect, cover the whole project, Remotion plus ffmpeg, Study Desk concept approved, one hour.
My assumptions (correct me if wrong): "whole project" means the video shows the v2 loop end to end (teacher publishes, students learn, teacher sees real results), not extra docs. The 4-minute slot and 50s / 60s talk split from the earlier spec still hold. Music is optional and the video works muted.

## How long: 75 seconds (2250 frames at 30fps)

- Slot math: 4:00 is the hard limit, target 3:15 = 195s. Live talk is 50s + 60s = 110s. That leaves 85s at most for video; 75s keeps a 10s safety buffer. The old 70s was for fewer features; v2 needs about 5s more.
- Outside guidance agrees: demo videos for judges work best at 60 to 90s, and the hook must land in the first 5s ([source](https://intercom.help/builderbase/en/articles/14836128-builder-s-guide-ch-14-crafting-a-demo-that-lands)).
- Pitch script times shift by 5s (video 0:50 to 2:05). `docs/pitch-script.md` does not exist yet, so nothing to rewrite.

## The wow: one continuous camera over a study desk

The whole product is laid on one big desk (desk = `paper-raised #EFE8DA`, sheets = `sheet #FBF8F2`, no shadows, depth from tone). The camera glides between sheets with eased pans and zooms, no hard cuts until the end card. The 8 lesson pages sit in a horizontal ribbon at the centre, and every scene travels along or around it. That is what makes the **wrong-answer fly-back** physical: the camera races left along a drawn ink line to the exact page that teaches it.

Three signature moments (everything else supports these):
1. **Order paints over chaos (0:07).** 32 real slides (from `samples/decks`, 18 + 14 sections) plus repeats make a 40-slide pile. One huge highlighter stroke sweeps across the frame; behind its leading edge the pile is already 8 clean pages. It is a clip-path wipe, so it is cheap to render and reads instantly.
2. **The fly-back (0:44).** Wrong answer in brick red, "Review this page", camera whips back along an ink line (SVG path drawn with `@remotion/paths` `evolvePath`, no arrowhead, since animated arrows are banned) and the right sentence gets its highlighter swipe.
3. **The class lights up (0:55).** 12 students tick into the teacher's table, the mastery bars grow, the weakest page's bar turns brick red, and "Re-teach page N" gets the swipe. Then the camera pulls all the way back to show the entire journey on one desk before the end card.

## Beats (30fps)

| Time | Frames | Beat | Motion and on-screen text |
|---|---|---|---|
| 0:00-0:07 | 0-210 | Hook | Frame 0 already has a word on it. Real slides drop onto the desk, cadence accelerating (one every 12 frames down to 3). Text slams in with a 6-frame ease-out slide, no bounce: "40 slides." / "Test on Friday." / "Where do you start?" |
| 0:07-0:13 | 210-390 | Swipe | Highlighter wipe turns the pile into 8 ordered pages. Wordmark swipe, "Slides in. Lesson out." Judge understands the product by 0:13. |
| 0:13-0:27 | 390-810 | Teacher | Camera glides to the teacher sheets: class "8A Biology" with its join code (real capture), PDF drops in, `LessonSkeleton` fills as status lines tick, review sheet with a quiz question edited, Publish. Captions: "Upload slides." "Fix any question." "Publish to your class." |
| 0:27-0:37 | 810-1110 | Students | Student home with the five subjects (real capture), the code typed in, lesson pages turn along the ribbon with `LessonPageView` and the swipe on each "Remember this". Captions: "One idea per page." "At your own pace." |
| 0:37-0:52 | 1110-1560 | Twist (slowest, 15s) | `QuizQuestionView`: pick a wrong option, it goes brick red, explanation, "Review this page", fly-back, swipe on the key sentence, retry, green. Caption: "Wrong answer? Straight back to the page that teaches it." Hold 2s for reading. |
| 0:52-1:05 | 1560-1950 | Class results | Rows tick in, bars grow, weak bar goes red, insight sentence types out. Small "Demo class" label so no number is passed off as real classroom data. Caption: "Who got it. Which page lost them." |
| 1:05-1:15 | 1950-2250 | Close | Camera pulls back over the whole desk, then the end card: wordmark with swipe, "Any slides. Any subject.", the five subjects in one line, "Made by {names}, age 14." Holds 3s+. |

Attention tactics: tempo ramps up in the first 7s then slows for the twist (contrast makes the twist land); the pattern break is the swipe; the audience sees the product's USP as an image (the fly-back), not a bullet; works on mute; all captions at least 56px; ends on a long hold so the Q&A starts on the logo.

Motion rules (from the anti-slop memory): ease-in-out cubic-bezier, no springs or overshoot, no blur or glow, no gradients, no shadows, no sparkles, no emojis, no em dashes, fonts Literata + Atkinson Hyperlegible Next, palette from `src/app/globals.css` only.

## Real product, not mockups

- **Pure components reused as-is** (all already take `progress`-style props, so they are frame-driven): `HighlightSwipe`, `LessonPageView`, `QuizQuestionView`, `ScoreView`, `MasteryBars`, `LessonSkeleton`, `Wordmark`, `StatsLine` in `src/components/`. Lesson and quiz text come from `src/demo/photosynthesis.json`.
- **Stateful v2 screens** (class page with join code, student subject list, review editor) cannot be imported (server actions, `next/link`, hooks). They are captured from the real running app: `scripts/capture-video-assets.mts` runs the seed against a separate `data/video.db` (`SLIDEKICK_DB`, `SLIDEKICK_FAKE_AI=1`, so no API credit and no touching real data), logs in as the seeded teacher (`teacher@demo.test`) and a seeded student, and saves 2x PNGs to `remotion/assets/`. `/data/` is already git-ignored.
- **Real results data**: the same script calls `buildClassReport` (`src/lib/class-report.ts`) on the seeded attempts (via `src/server/results.ts`) and writes `remotion/assets/report.json`. The results scene renders `MasteryBars` and a 4-column table from it, so the numbers are the app's real output on the demo class.
- **Slide thumbnails**: the same script screenshots every `section.slide` in `samples/decks/*.html`.

## Files

New: `remotion.config.ts` (alias `@` to `src`, `enableTailwind`), `remotion/index.ts`, `remotion/Root.tsx` (compositions `Promo` 1920x1080 30fps 2250 frames, stills `StageOpen` and `StageClose`), `remotion/timing.ts` (beat frames, so cuts can follow a music track), `remotion/fonts.ts` (`@remotion/google-fonts` `loadFont` for Literata and Atkinson, sets `--font-literata` / `--font-atkinson`), `remotion/video.css` (imports `src/app/globals.css`, adds `@source` for `src/components`), `remotion/Desk.tsx` (camera keyframes and sheet positions), `remotion/scenes/*.tsx` (one file per beat), `remotion/Caption.tsx`, `remotion/tsconfig.json`, `scripts/capture-video-assets.mts`, `scripts/finalize-video.sh` (ffmpeg).
Edited: `package.json` (exact-pinned `remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/tailwind-v4`, `@remotion/google-fonts`, `@remotion/paths` all at 4.0.534; scripts `video:capture`, `video:studio`, `video:render`, `video:stills`, `video:final`), root `tsconfig.json` (exclude `remotion`, so `next build` is untouched), `eslint.config.mjs` (ignore `remotion/**` if it complains), `README.md` (render steps), `docs/superpowers/specs/2026-10-04-slidekick-design.md` section 11 (point to the new storyboard). This plan is also saved as `docs/superpowers/specs/2026-10-07-slidekick-promo-video-design.md` as step 0.

## ffmpeg's job

Remotion renders the frames (H.264, `--crf 16`, 1920x1080, 30fps). ffmpeg 9.0.2 (already installed, has libx264, aac, libopus) then:
1. Mux music if `public/music/promo.mp3` exists: 1s fade-in, fade-out over the last 3s, `loudnorm` to -16 LUFS. No file means a silent but valid video (adds a silent AAC track so strict players do not choke).
2. Re-encode for venue laptops: H.264 High, `yuv420p`, `-movflags +faststart`, AAC 192k, `out/slidekick-promo.mp4`.
3. Stretch (first thing cut if time runs short): synthesized sound design from `lavfi` (bandpass-swept noise for the swipe, 30ms sine ticks for the slide landings and table rows, a soft low thud for the wrong answer), mixed under the music at timing.ts frames.
4. Stretch: a 20s teaser cut for sharing.

## One-hour build order and cut line

| Min | Work |
|---|---|
| 0-8 | Install, config, fonts and Tailwind alias, render one still to prove the pipeline (Chrome Headless Shell downloads on first run and needs internet; fonts too) |
| 8-16 | `video:capture`: seed, screenshots, `report.json` |
| 16-40 | Scenes in beat order, simple camera first; every beat present by minute 35 |
| 40-45 | Camera polish: eased pans, fly-back path, pull-back |
| 45-60 | Half-scale draft render and check, final render, ffmpeg finalize, verify |

Hardware note: this laptop is a 2013 i7-4800MQ (4 cores, 16GB, no useful GPU). I cannot know the frame rate until the first render. My estimate is 10 to 25 minutes for the final 2250 frames, which is the real risk to the hour. Mitigation: keep scenes DOM-light (no blur, no filters, at most 8 big images on the desk), render a `--scale=0.5` draft first, and have a complete (even if plain) draft playable by minute 35 so there is always something to ship.
Cut order if behind: sound design, teaser, the "edited question" state, the pull-back (use a fade), live tick-in (static table). Never cut: the swipe hook, the fly-back, the end card.

Parallel option: the scenes are independent files, so subagents could build them side by side. I will not spawn any unless you say so.

## Verification

1. `npx remotion compositions` lists `Promo` (2250 frames) and the two stills.
2. `npx remotion still` at a frame inside every beat (30, 300, 600, 950, 1300, 1700, 2100), view each PNG against the table above; check caption sizes are 56px or more and text contrast is at least 4.5:1.
3. Play the draft with the sound off and confirm a stranger would get the story.
4. `ffprobe` the final: 75.0s, 1920x1080, 30fps, `h264 yuv420p`, AAC track, moov at the front (faststart). Open it in a second player (VLC or the venue's slide software).
5. Regression: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` still pass; `git status` shows `out/`, `data/` and the capture DB untracked-ignored.
6. Render `out/stage-open.png` and `out/stage-close.png`.

## Needed from you (none block the render)

- Presenters' first names for the end card (placeholder "Name and Name" until then, one value in `remotion/timing.ts`).
- Optional music track at `public/music/promo.mp3` (Pixabay or YouTube Audio Library).
- Optional real proof (quiz average from classmates, one named quote with permission) for the end card. Without it the card carries no statistic.

## Risks

- Render time on this laptop (above).
- `@remotion/tailwind-v4` pins tailwindcss 4.2.0 while the app uses 4.3.3. If class generation misbehaves, fall back to precompiling one CSS file with the project's Tailwind and importing it as plain CSS.
- `@remotion/google-fonts` must expose Atkinson Hyperlegible Next. If not, load the woff2 from Fontsource.
- Remotion license: free for individuals and for-profit teams up to 3 ([license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)); a student competition entry qualifies.
- The seeded results are demo data; the video labels them "Demo class".

## As built (2026-10-07)

Where the finished video differs from the plan above:

- **The twist uses the real app's flow.** The student answers question 3 wrongly (the quiz screen goes brick red and green), then the real results screen shows "Review page 4: Light reactions". The ink thread is drawn from that link, and the camera flies back to page 4. The plan's "Review this page" button does not exist in the app.
- **Beat frames** (30fps): hook 0-210, wipe and name 210-372, teacher 372-880, students 880-1260, twist 1260-1760, class results 1760-2010, close 2010-2250. Camera stops are in `remotion/layout.ts`; captions are in `remotion/Caption.tsx`.
- **Everything on the desk is real**: lesson pages, quiz and student results are the app's own components; the class page, quiz editor, subject list and join screen are screenshots of the running app; the class report is `buildClassReport` on the seeded attempts.
- **Capture** runs its own dev server in `.next-video` (`NEXT_DIST_DIR`) because Next allows one dev server per build folder and a normal `npm run dev` is usually running. `next.config.ts` reads that variable; unset, nothing changes.
- **Render speed** was much better than feared: the half-resolution draft renders all 2250 frames in about 71 seconds on this laptop.
- **Sound design is built** (`npm run video:sfx`): 125 cues synthesized in code (`scripts/sfx-synth.ts`: sine waves and filtered noise), placed from `remotion/sfx-cues.ts`, mixed to `out/sfx.wav`, then muxed by `scripts/finalize-video.sh`. This differs from the plan, which said ffmpeg `lavfi`: synthesizing in code allows pitch sweeps and frame-exact placement, and ffmpeg still does the mixing, levelling and encoding. Measured: -20.6 LUFS integrated, -1.9 dBFS peak, no clipping, 0 ms offset from the picture. It has not been listened to by the author of this note; gains are meant to be tuned by ear.
- **One timing sheet**: every moment inside the video lives in `remotion/events.ts`; the picture and the sound both read it.
- **A render bug found on the way**: the loading rows in the upload sheet use a CSS animation, which follows the wall clock and so flickered differently on every render. It is now driven by the frame number (`--pulse`).
- **Not built**: the 20 second teaser (stretch item). Music is optional at `public/music/promo.mp3`.
- **Open inputs**: presenters' names (`PRESENTERS` in `remotion/timing.ts`) and a music track.
