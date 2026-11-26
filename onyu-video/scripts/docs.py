"""narration.md(장면별 내레이션·화면·시간)와 SRT 자막을 만든다.

src/timeline.ts 와 같은 규칙(script.json timingRules, 30fps 프레임 반올림)으로 계산한다.
- 파트별 SRT: out/ONYU_Intro.srt, out/ONYU_Operations.srt, out/ONYU_Closing.srt
- 전체 SRT: out/ONYU_10min.srt (실사·상담 구간은 전사 범위를 명시하는 안내 자막만)
사용: python3 scripts/docs.py [--class-dur 초] [--consult-dur 초]
"""
import argparse, json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
d = json.load(open(os.path.join(ROOT, "src/data/script.json"), encoding="utf-8"))
T = json.load(open(os.path.join(ROOT, "src/data/timing.json"), encoding="utf-8"))
R = d["timingRules"]
f = lambda s: round(s * FPS)


def scenes(part):
    out, acc = [], 0
    for sc in [s for s in d["scenes"] if s["part"] == part]:
        t = T[sc["id"]]
        cur = R["lead"] + R["extraLead"].get(sc["id"], 0)
        lines = []
        for i, l in enumerate(t["lines"]):
            start = cur
            cur += l["dur"] + (R["gap"] if i < len(t["lines"]) - 1 else 0)
            chunks = []
            for j, c in enumerate(l["chunks"]):
                a = f(start + c["start"])
                b = f(start + c["end"]) if j < len(l["chunks"]) - 1 else f(start + l["dur"] + 0.15)
                chunks.append((acc + a, acc + b, c["text"]))
            lines.append({"from": acc + f(start), "dur": l["dur"], "chunks": chunks, "say": " ".join((c[1] if len(c) > 1 else c[0]) for c in sc["lines"][i])})
        dur = f(cur + R["tail"] + R["extraTail"].get(sc["id"], 0))
        out.append({"sc": sc, "from": acc, "dur": dur, "lines": lines})
        acc += dur
    return out, acc


def tc(frames, srt=True):
    ms = round(frames * 1000 / FPS)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}" if srt else f"{m:02d}:{s:02d}"


def probe(path):
    try:
        return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())
    except Exception:
        return None


ap = argparse.ArgumentParser()
ap.add_argument("--class-dur", type=float, default=None)
ap.add_argument("--consult-dur", type=float, default=None)
a = ap.parse_args()
class_dur = a.class_dur or probe(os.path.join(ROOT, "out/norm/2_class.mp4")) or probe(os.path.join(ROOT, "footage/ONYU_Class_Upload.mp4"))
consult_real = probe(os.path.join(ROOT, "out/ONYU_Consultation.mp4"))
consult_dur = a.consult_dur or consult_real or 105.0

parts = {p: scenes(p) for p in ["intro", "operations", "closing"]}
NO_SUBS = {"hook", "message", "brand"}
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)


def subs_of(part, offset=0):
    res = []
    for s in parts[part][0]:
        if s["sc"]["visual"]["type"] in NO_SUBS:
            # 화면 문구가 곧 내레이션인 장면: 화면에는 자막을 띄우지 않지만 SRT에는 포함(청각 보조용)
            pass
        for l in s["lines"]:
            for (x, y, t) in l["chunks"]:
                res.append((x + offset, y + offset, t))
    return res


def write_srt(path, items):
    with open(path, "w", encoding="utf-8") as fp:
        for i, (x, y, t) in enumerate(items, 1):
            fp.write(f"{i}\n{tc(x)} --> {tc(y)}\n{t}\n\n")


names = {"intro": "Intro", "operations": "Operations", "closing": "Closing"}
for p in parts:
    write_srt(os.path.join(ROOT, f"out/ONYU_{names[p]}.srt"), subs_of(p))

# 전체 타임라인
o_intro = 0
o_class = parts["intro"][1]
o_consult = o_class + f(class_dur)
o_ops = o_consult + f(consult_dur)
o_close = o_ops + parts["operations"][1]
total = o_close + parts["closing"][1]
full = subs_of("intro", o_intro)
full.append((o_class + 15, o_class + 105, "[실사 수업영상 · 촬영 음성 · 원본 영상 화면 자막 사용 — 이 구간 대사는 별도 전사하지 않음]"))
if consult_real:
    full.append((o_consult + 3, o_consult + 60, "[상담 장면 · 실제 촬영 음성 — 자막은 영상에 직접 표시]"))
else:
    full.append((o_consult + 3, o_consult + 90, "[상담 장면 · 촬영 예정 — 촬영본 도착 후 전사]"))
full += subs_of("operations", o_ops) + subs_of("closing", o_close)
write_srt(os.path.join(ROOT, "out/ONYU_10min.srt"), full)

# narration.md
L = []
L.append("# ONYU 10분 UCC – 장면별 내레이션\n")
L.append("자동 생성 문서 (`python3 scripts/docs.py`). 시간은 실제 TTS 길이 기준이며 30fps 프레임 단위로 반올림했습니다.\n")
L.append(f"- 음성: Microsoft Edge 신경망 TTS `{d['voice']}` (속도 {d['rate']}) · 실사·상담 구간은 촬영 음성만 사용\n")
L.append("- **화면 자막**과 **음성용 문장**(숫자·영문을 한국어 발음으로 풀어 쓴 것)이 다를 때는 둘 다 적었습니다.\n")
L.append("\n## 전체 구성\n\n| 구간 | 시작 | 길이 | 내용 | 상태 |\n| --- | --- | --- | --- | --- |")
L.append(f"| A~C 소개·앱 (ONYU_Intro.mp4) | {tc(o_intro, False)} | {tc(parts['intro'][1], False)} | 문제 제기 · 온유 소개 · 방문 전 앱 경험 · 실사 안내 | 완성 |")
L.append(f"| D 실사 수업 | {tc(o_class, False)} | {tc(f(class_dur), False)} | 기존 수업영상 통째 사용 (대사·순서 보존) | 확인용 압축 사본 → 고화질 원본 교체 예정 |")
L.append(f"| E 상담 | {tc(o_consult, False)} | {tc(f(consult_dur), False)} | 수업 후 매니저 상담 + 앱 화면 삽입 | {'완성' if consult_real else '**촬영 전** (목표 길이로 자리만 확보)'} |")
L.append(f"| F 운영 (ONYU_Operations.mp4) | {tc(o_ops, False)} | {tc(parts['operations'][1], False)} | 경쟁시설 · 인력 · 홍보 · 예산 | 완성 |")
L.append(f"| G 마무리 (ONYU_Closing.mp4) | {tc(o_close, False)} | {tc(parts['closing'][1], False)} | 메시지 · 가격 · 무료체험 · QR · 크레딧 | 완성 |")
L.append(f"| **합계** | | **{tc(total, False)}** | | |\n")
for p in ["intro", "operations", "closing"]:
    base = {"intro": o_intro, "operations": o_ops, "closing": o_close}[p]
    if p == "operations":
        L.append(f"\n## D 실사 수업 ({tc(o_class, False)}~) · E 상담 ({tc(o_consult, False)}~)\n")
        L.append("- D: 기존 완성본을 그대로 사용. AI 내레이션·새 자막을 겹치지 않음. 원본에 들어 있는 화면 자막을 그대로 둠.")
        L.append("- E: `docs/consultation_script.md` 대본으로 촬영 → `src/data/consult.json` 에 컷·앱 화면 삽입 지정 → `Consultation` 렌더.\n")
    L.append(f"\n## 파트: ONYU_{names[p]}.mp4\n")
    for s in parts[p][0]:
        sc = s["sc"]
        v = sc["visual"]
        L.append(f"\n### {sc['id']} · {sc['section']}  ({tc(base + s['from'], False)}–{tc(base + s['from'] + s['dur'], False)}, 파트 내 {tc(s['from'], False)})\n")
        desc = v.get("title") or v.get("text", "").replace("\n", " ") or v.get("slogan", "") or " / ".join(v.get("lines", []))
        L.append(f"- 화면: `{v['type']}` — {desc}")
        if v["type"] == "app":
            L.append("- 앱 캡처: " + ", ".join(f"`{x['shot']}`" for x in v["shots"]))
        L.append("")
        for i, l in enumerate(s["lines"]):
            sub = " ".join(c[2] for c in l["chunks"])
            L.append(f"{i + 1}. [{tc(base + l['from'], False)}] {sub}")
            if l["say"].replace(",", "").replace(" ", "") != sub.replace(",", "").replace(" ", ""):
                L.append(f"   - 음성용: {l['say']}")
open(os.path.join(ROOT, "docs/narration.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"intro {parts['intro'][1]/FPS:.1f}s, class {class_dur:.1f}s, consult {consult_dur:.1f}s{'' if consult_real else ' (목표)'}, ops {parts['operations'][1]/FPS:.1f}s, closing {parts['closing'][1]/FPS:.1f}s → 합계 {total/FPS:.1f}s ({tc(total, False)})")
