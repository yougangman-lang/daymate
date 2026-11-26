// 실제 TTS 길이(timing.json)로부터 장면·문장·자막 조각의 프레임을 계산한다.
// 화면·음성·자막이 같은 시간표를 공유하도록 이 파일 하나에서만 계산한다.
import script from './data/script.json';
import timing from './data/timing.json';
import { FPS } from './theme';

export type Part = 'intro' | 'operations' | 'closing';

export interface Chunk { text: string; from: number; to: number } // 장면 기준 프레임
export interface Line { file: string; from: number; dur: number; chunks: Chunk[] }
export interface SceneT {
  id: string;
  part: Part;
  section: string;
  visual: any;
  from: number; // 파트 기준 시작 프레임
  dur: number;
  lines: Line[];
}

// 간격 규칙은 script.json(timingRules)에 두어 scripts/docs.py(자막·대본 문서)와 같은 값을 쓴다.
const R = (script as any).timingRules;
const LEAD: number = R.lead; // 장면 시작 후 첫 음성까지
const GAP: number = R.gap; // 문장 사이
const TAIL: number = R.tail; // 마지막 음성 후 장면 끝까지
const EXTRA_TAIL: Record<string, number> = R.extraTail; // 읽을 시간이 더 필요한 화면 (G2_end: QR 인식 시간)
const EXTRA_LEAD: Record<string, number> = R.extraLead;

const f = (s: number) => Math.round(s * FPS);

function buildScene(sc: any): Omit<SceneT, 'from'> {
  const t = (timing as any)[sc.id];
  if (!t) throw new Error(`timing 없음: ${sc.id} (python3 scripts/tts.py 실행 필요)`);
  let cur = LEAD + (EXTRA_LEAD[sc.id] ?? 0);
  const lines: Line[] = t.lines.map((l: any, i: number) => {
    const start = cur;
    cur += l.dur + (i < t.lines.length - 1 ? GAP : 0);
    return {
      file: l.file,
      from: f(start),
      dur: f(l.dur),
      chunks: l.chunks.map((c: any, j: number) => ({
        text: c.text,
        from: f(start + c.start),
        // 조각 끝: 다음 조각 시작 또는 문장 끝 + 약간 유지
        to: j < l.chunks.length - 1 ? f(start + c.end) : f(start + l.dur + 0.15),
      })),
    };
  });
  const dur = f(cur + TAIL + (EXTRA_TAIL[sc.id] ?? 0));
  return { id: sc.id, part: sc.part, section: sc.section, visual: sc.visual, dur, lines };
}

export function partScenes(part: Part): SceneT[] {
  let from = 0;
  return (script as any).scenes
    .filter((s: any) => s.part === part)
    .map((s: any) => {
      const b = buildScene(s);
      const r = { ...b, from };
      from += b.dur;
      return r;
    });
}

export function partDuration(part: Part) {
  return partScenes(part).reduce((a, s) => a + s.dur, 0);
}

/** 장면 안에서 n번째 문장 시작 프레임 (없으면 마지막 문장 기준) */
export function beat(s: SceneT, n: number) {
  const l = s.lines[Math.min(n, s.lines.length - 1)];
  return l ? l.from : 0;
}
