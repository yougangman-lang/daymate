#!/usr/bin/env bash
# 최종 조립: 소개(A~C) → 실사 수업(D) → 상담(E) → 운영(F) → 마무리(G)
#
#  CLASS_SRC   실사 수업영상 경로 (기본: footage/ONYU_Class_Upload.mp4 = 압축 확인용 사본)
#              → 고화질 원본이 생기면 CLASS_SRC=/경로/여가레영상.mov 로 바꿔 다시 실행
#  CONSULT_SRC 상담 파트 경로 (기본: out/ONYU_Consultation.mp4, Remotion Consultation 컴포지션 렌더 결과)
#              없으면 '편집용 초안'으로만 조립하고 상담 위치에 교체 안내 화면(목표 길이)을 넣는다.
#
# 모든 파트를 1920x1080 / 30fps / yuv420p(BT.709) / AAC 48kHz 스테레오로 맞추고,
# 말소리 기준 음량(-16 LUFS, 최대 -1.5 dBTP)으로 정규화한 뒤 이어 붙인다.
# 실사 원본은 화면 비율을 유지한 채 확대만 하며(왜곡·생성 없음), 앞뒤에만 0.4초 크림색 디졸브를 준다.
set -euo pipefail
cd "$(dirname "$0")/.."

CLASS_SRC="${CLASS_SRC:-footage/ONYU_Class_Upload.mp4}"
CONSULT_SRC="${CONSULT_SRC:-out/ONYU_Consultation.mp4}"
CONSULT_TARGET="${CONSULT_TARGET:-105}" # 상담 촬영본이 없을 때 초안에 비워 둘 목표 길이(초)
FONT_FILE="node_modules/pretendard/dist/public/static/Pretendard-Bold.otf"
mkdir -p out/norm
CREAM=0xF6F0E6

VENC=(-c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -r 30)
AENC=(-c:a aac -b:a 192k -ar 48000 -ac 2)
LOUD="loudnorm=I=-16:TP=-1.5:LRA=11"

norm_part () { # 렌더된 파트: 음량만 정규화
  ffmpeg -v error -y -i "$1" -c:v copy -af "$LOUD,aresample=48000" "${AENC[@]}" "$2"
}

norm_footage () { # 실사: 1080p·30fps 맞춤 + 앞뒤 디졸브 + 음량 정규화
  local src="$1" out="$2"
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  local fo; fo=$(python3 -c "print(max(0,float('$d')-0.4))")
  ffmpeg -v error -y -i "$src" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,setsar=1,fade=t=in:st=0:d=0.4:color=$CREAM,fade=t=out:st=$fo:d=0.4:color=$CREAM,format=yuv420p" \
    -af "$LOUD,aresample=48000,afade=t=in:st=0:d=0.3,afade=t=out:st=$fo:d=0.4" \
    "${VENC[@]}" "${AENC[@]}" -movflags +faststart "$out"
}

echo "== 파트 정규화"
norm_part out/ONYU_Intro.mp4 out/norm/1_intro.mp4
norm_footage "$CLASS_SRC" out/norm/2_class.mp4
cp out/norm/2_class.mp4 out/ONYU_Class.mp4   # 실사 구간 단독 파일(교체·확인용)
norm_part out/ONYU_Operations.mp4 out/norm/4_ops.mp4
norm_part out/ONYU_Closing.mp4 out/norm/5_closing.mp4

FINAL=1
if [ -f "$CONSULT_SRC" ]; then
  norm_part "$CONSULT_SRC" out/norm/3_consult.mp4
else
  FINAL=0
  echo "!! 상담 촬영본 없음 → 편집용 초안으로 조립 (상담 위치 ${CONSULT_TARGET}초 안내 화면)"
  ffmpeg -v error -y -f lavfi -i "color=c=$CREAM:s=1920x1080:r=30:d=$CONSULT_TARGET" -f lavfi -i "anullsrc=r=48000:cl=stereo" -t "$CONSULT_TARGET" \
    -vf "drawtext=fontfile=$FONT_FILE:text='편집용 초안 – 상담 촬영본 삽입 위치':fontcolor=0x302B25:fontsize=72:x=(w-tw)/2:y=420,drawtext=fontfile=$FONT_FILE:text='E 구간 · 수업 후 매니저 상담 · 목표 ${CONSULT_TARGET}초':fontcolor=0x526547:fontsize=48:x=(w-tw)/2:y=540,drawtext=fontfile=$FONT_FILE:text='docs/consultation_script.md 대본으로 촬영 후 교체':fontcolor=0x625849:fontsize=40:x=(w-tw)/2:y=630" \
    "${VENC[@]}" "${AENC[@]}" out/norm/3_consult.mp4
fi

echo "== 이어 붙이기"
OUT=out/ONYU_10min_final.mp4
[ "$FINAL" = 0 ] && OUT=out/ONYU_10min_DRAFT_no_consult.mp4
ffmpeg -v error -y \
  -i out/norm/1_intro.mp4 -i out/norm/2_class.mp4 -i out/norm/3_consult.mp4 -i out/norm/4_ops.mp4 -i out/norm/5_closing.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" "${VENC[@]}" "${AENC[@]}" -movflags +faststart "$OUT"

echo "== 결과: $OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -of compact "$OUT"
for f in out/norm/*.mp4; do printf '%-28s %s\n' "$f" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"; done
