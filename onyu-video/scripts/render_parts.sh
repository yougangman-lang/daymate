#!/usr/bin/env bash
# 소개·운영·마무리 파트를 렌더링하고 일반 플레이어 호환 형식(yuv420p, BT.709, AAC 48k)으로 정리한다.
# 사용: bash scripts/render_parts.sh [Intro Operations Closing]
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME_ARG=()
if [ -n "${REMOTION_CHROME:-}" ]; then CHROME_ARG=(--browser-executable="$REMOTION_CHROME"); fi
PARTS=("${@:-Intro Operations Closing}")
mkdir -p out/raw
for P in ${PARTS[@]}; do
  echo "== render $P"
  npx remotion render src/index.ts "$P" "out/raw/$P.mp4" "${CHROME_ARG[@]}" --log=error
  ffmpeg -v error -y -i "out/raw/$P.mp4" \
    -vf "scale=in_range=full:out_range=tv,format=yuv420p" -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:v libx264 -preset slow -crf 16 -profile:v high -r 30 \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "out/ONYU_$P.mp4"
  ffprobe -v error -show_entries format=duration:stream=codec_name,pix_fmt,width,height,r_frame_rate -of compact "out/ONYU_$P.mp4"
done
