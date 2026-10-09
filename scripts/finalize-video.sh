#!/usr/bin/env bash
# scripts/finalize-video.sh
# Turns Remotion's render (out/promo-raw.mp4) into out/recall-promo.mp4 for venue laptops:
# H.264 High, yuv420p, AAC audio, index at the front so it starts playing at once.
# Audio, whichever of these exist:
#   - out/sfx.wav (npm run video:sfx): the synthesized sound design
#   - public/music/promo.mp3: music, faded in over 1s and out over the last 3s, levelled to a quiet bed under the effects
#   - neither: a silent AAC track, because some players and slide programs reject video with no audio stream
# The video stream is copied, not re-encoded, so there is no second round of compression.
set -euo pipefail

RAW="${RAW:-out/promo-raw.mp4}"
OUT="${OUT:-out/recall-promo.mp4}"
SFX="out/sfx.wav"
MUSIC="${MUSIC:-public/music/promo.mp3}"
MUSIC_LUFS="-23" # the effects sit around -20 LUFS; raise this number to make the music louder

[ -f "$RAW" ] || { echo "Missing $RAW. Run: npm run video:render" >&2; exit 1; }

SECONDS_TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW" | awk '{printf "%d", $1 + 0.5}')
FADE_OUT_AT=$((SECONDS_TOTAL - 3))
MUSIC_CHAIN="aresample=48000,atrim=0:${SECONDS_TOTAL},afade=t=in:st=0:d=1,afade=t=out:st=${FADE_OUT_AT}:d=3,loudnorm=I=${MUSIC_LUFS}:TP=-3:LRA=11"
COPY_VIDEO=(-c:v copy -movflags +faststart)

if [ -f "$SFX" ] && [ -f "$MUSIC" ]; then
  echo "Adding sound effects and music"
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i "$MUSIC" -i "$SFX" \
    -filter_complex "[1:a]${MUSIC_CHAIN}[m];[m][2:a]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.9[a]" \
    -map 0:v -map "[a]" "${COPY_VIDEO[@]}" -c:a aac -b:a 192k -ar 48000 -t "$SECONDS_TOTAL" "$OUT"
elif [ -f "$SFX" ]; then
  echo "Adding sound effects (no music at $MUSIC)"
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i "$SFX" \
    -map 0:v -map 1:a "${COPY_VIDEO[@]}" -c:a aac -b:a 192k -ar 48000 -t "$SECONDS_TOTAL" "$OUT"
elif [ -f "$MUSIC" ]; then
  echo "Adding music (no sound effects at $SFX; run npm run video:sfx)"
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i "$MUSIC" \
    -filter_complex "[1:a]${MUSIC_CHAIN}[a]" \
    -map 0:v -map "[a]" "${COPY_VIDEO[@]}" -c:a aac -b:a 192k -ar 48000 -t "$SECONDS_TOTAL" "$OUT"
else
  echo "No sound effects or music found, adding a silent audio track"
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" -f lavfi -i "anullsrc=r=48000:cl=stereo" \
    -map 0:v -map 1:a "${COPY_VIDEO[@]}" -c:a aac -b:a 128k -shortest "$OUT"
fi

echo "Wrote $OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate -of default=nw=1 "$OUT"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
