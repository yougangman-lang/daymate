# onyu-video · 온유 10분 UCC (Remotion)

기존 앱(`../onyu/`)과 분리된 영상 프로젝트입니다. 앱 코드·데이터·배포 설정은 건드리지 않습니다.

## 구성

| 구간 | 파일 | 만드는 방법 |
| --- | --- | --- |
| A~C 문제 제기·온유 소개·방문 전 앱 경험 (+ 실사 안내) | `out/ONYU_Intro.mp4` | Remotion `Intro` |
| D 실사 수업영상 | `out/ONYU_Class.mp4` | `scripts/assemble.sh`가 원본을 1080p·30fps·음량만 맞춤 |
| E 수업 후 매니저 상담 | `out/ONYU_Consultation.mp4` | Remotion `Consultation` (촬영본 필요) |
| F 경쟁시설·인력·홍보·예산 | `out/ONYU_Operations.mp4` | Remotion `Operations` |
| G 마무리·가격·QR·크레딧 | `out/ONYU_Closing.mp4` | Remotion `Closing` |
| 전체 | `out/ONYU_10min_final.mp4` (상담 없으면 `ONYU_10min_DRAFT_no_consult.mp4`) | `scripts/assemble.sh` |

```
src/data/script.json   장면별 내레이션(화면 자막/음성용 문장), 화면 구성, 간격 규칙 ← 대본 수정은 여기
src/data/timing.json   TTS 실제 길이·단어 경계 (자동 생성)
src/data/consult.json  상담 촬영본 컷·앱 화면 삽입·자막 (촬영 후 작성)
src/scenes.tsx         장면 디자인 / src/components/AppPanel.tsx 앱 캡처 확대·이동·강조
public/app/            실제 앱 캡처(가상 시연 데이터) + manifest.json(강조 좌표)
public/voice/          내레이션 음성
public/qr.png          https://daymate-onyu.vercel.app/ QR (디코딩 검증)
docs/                  narration.md(자동 생성), consultation_script.md
```

## 실행 순서 (모두 이 폴더에서)

```bash
npm ci
```

```bash
pip install edge-tts
```

1) 앱 캡처 (대본·화면을 바꿀 때만). 먼저 `../onyu`에서 `npm ci && npm run build && npx vite preview --port 4173` 실행 후:

```bash
node scripts/capture.cjs
```

2) 내레이션 음성 생성 (`script.json` 수정 시. 바뀐 문장만 다시 만듦)

```bash
python3 scripts/tts.py
```

3) 미리보기

```bash
npm run studio
```

4) 파트 렌더링 (소개·운영·마무리)

```bash
bash scripts/render_parts.sh
```

이 컨테이너에서는 설치된 Chromium을 쓰도록 `REMOTION_CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`을 지정했습니다. 일반 PC에서는 지정하지 않으면 Remotion이 브라우저를 직접 내려받습니다.

5) 상담 촬영본 결합 (도착 후): `footage/consult_1.mp4`… 를 `public/footage/`에 복사 → `src/data/consult.json`의 `clips`(구간), `inserts`(`_plan` 참고), `subtitles`(실제 음성 확인 문장) 작성 →

```bash
npx remotion render src/index.ts Consultation out/ONYU_Consultation.mp4
```

6) 최종 조립 — 실사 수업은 고화질 원본 경로로 교체:

```bash
CLASS_SRC="/경로/여가레 영상.mov" bash scripts/assemble.sh
```

7) 자막(SRT)·narration.md 갱신

```bash
python3 scripts/docs.py
```

## 사실 확인 원칙

- 수치는 최종 보고서(「온유 피트니스시설 사업계획안」, 2026.11.30 제출본 PDF) 기준.
- 인바디 연동·결제·제휴 협약·자격 보유 인력 채용·고객 성과는 **완료된 것처럼 표현하지 않음** (앱 화면 하단에 “가상 시연 데이터” 표시).
- 시설 화면은 앱의 공간 구성 일러스트(실측 도면·실제 사진 아님).
- 인플루언서 4개 채널은 **협업 제안(계획)**, 팔로워·성과 수치는 표기하지 않음.
