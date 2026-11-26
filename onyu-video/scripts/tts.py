"""장면별 내레이션 TTS 생성 + 자막 조각 타이밍 계산.

입력: src/data/script.json
출력: public/voice/<scene>_<n>.mp3, src/data/timing.json
- edge-tts(Microsoft 신경망 음성)의 단어 경계(WordBoundary)로 자막 조각 시작 시각을 실제 음성에 맞춘다.
- 텍스트가 바뀐 문장만 다시 생성(해시 캐시).
- 프록시 환경이면 HTTPS_PROXY 를 그대로 사용한다. 비밀키 불필요.
사용: python3 scripts/tts.py
"""
import asyncio, hashlib, json, os, subprocess, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "src", "data", "script.json")
TIMING = os.path.join(ROOT, "src", "data", "timing.json")
VOICE_DIR = os.path.join(ROOT, "public", "voice")
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")


def chunk_say(c):
    return c[1] if len(c) > 1 else c[0]


async def synth(text, voice, rate, out_mp3):
    kw = {"boundary": "WordBoundary"}
    if PROXY:
        kw["proxy"] = PROXY
    com = edge_tts.Communicate(text, voice, rate=rate, **kw)
    words = []
    with open(out_mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"]})
    return words


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float(out.strip())


def chunk_times(chunks, words, dur):
    """각 자막 조각의 음성 텍스트 위치를 단어 경계에 대응시켜 시작 시각을 구한다."""
    says = [chunk_say(c) for c in chunks]
    full = " ".join(says)
    # 단어 위치 찾기 (순차 탐색)
    pos, wpos = 0, []
    for w in words:
        i = full.find(w["w"], pos)
        if i < 0:
            i = pos
        wpos.append(i)
        pos = i + len(w["w"])
    starts, cpos = [], 0
    for s in says:
        st = None
        for w, p in zip(words, wpos):
            if p >= cpos:
                st = w["t"]
                break
        starts.append(st if st is not None else (starts[-1] if starts else 0.0))
        cpos += len(s) + 1
    starts[0] = 0.0
    res = []
    for i, c in enumerate(chunks):
        end = starts[i + 1] if i + 1 < len(chunks) else dur
        res.append({"text": c[0], "start": round(starts[i], 3), "end": round(end, 3)})
    return res


async def main():
    data = json.load(open(SCRIPT, encoding="utf-8"))
    voice, rate = data["voice"], data.get("rate", "+0%")
    os.makedirs(VOICE_DIR, exist_ok=True)
    old = json.load(open(TIMING, encoding="utf-8")) if os.path.exists(TIMING) else {}
    timing = {}
    for sc in data["scenes"]:
        lines = []
        for n, chunks in enumerate(sc["lines"]):
            text = " ".join(chunk_say(c) for c in chunks)
            h = hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:12]
            name = f"{sc['id']}_{n}.mp3"
            mp3 = os.path.join(VOICE_DIR, name)
            prev = next((l for l in old.get(sc["id"], {}).get("lines", []) if l.get("file") == f"voice/{name}"), None)
            if prev and prev.get("hash") == h and os.path.exists(mp3) and prev.get("words"):
                words = prev["words"]
            else:
                for attempt in range(4):
                    try:
                        words = await synth(text, voice, rate, mp3)
                        break
                    except Exception as e:  # 네트워크 일시 오류 재시도
                        print("retry", name, e, file=sys.stderr)
                        await asyncio.sleep(2 * (attempt + 1))
                else:
                    raise SystemExit(f"TTS 실패: {name}")
                print("tts", name, text[:40])
            dur = duration(mp3)
            lines.append({"file": f"voice/{name}", "hash": h, "dur": round(dur, 3), "words": words,
                          "chunks": chunk_times(chunks, words, dur)})
        timing[sc["id"]] = {"lines": lines}
    json.dump(timing, open(TIMING, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    total = sum(l["dur"] for s in timing.values() for l in s["lines"])
    print(f"총 음성 길이 {total:.1f}s")
    for sid, s in timing.items():
        print(f"  {sid:14s} {sum(l['dur'] for l in s['lines']):6.1f}s")


asyncio.run(main())
