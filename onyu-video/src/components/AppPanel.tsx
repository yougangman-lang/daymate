// 실제 앱 캡처(public/app/*.png, 430x932 CSS px @3x)를 크게 잘라 보여주는 패널.
// 글씨가 작아지지 않도록 기기 모형 대신 화면 일부를 확대하고, 문장 길이에 맞춰 천천히 세로 이동한다.
import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import manifest from '../../public/app/manifest.json';
import { C, FONT } from '../theme';

export interface ShotCue {
  shot: string;
  crop: [number, number, number, number]; // x,y,w,h (CSS px) 보여줄 관심 영역
  hl?: string; // 강조할 요소 키 (manifest boxes)
  hl2?: string;
  tag?: string;
  from: number; // 장면 기준 시작 프레임
  to: number; // 끝 프레임
}

const PW = 900; // 패널 크기
const PH = 800;

const ShotView: React.FC<{ cue: ShotCue }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const m = (manifest as any)[cue.shot];
  const [cx, cy, cw, ch] = cue.crop;
  const scale = PW / cw; // 가로 폭 기준 확대
  const viewH = PH / scale; // 보이는 높이 (CSS px)
  // 관심 영역이 보이는 높이보다 길면 문장 동안 위→아래로 천천히 이동
  const travel = Math.max(0, ch - viewH);
  const p = interpolate(frame, [cue.from + 12, cue.to - 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const y0 = travel > 0 ? cy + travel * p : cy + (ch - viewH) / 2;
  const top = Math.max(0, Math.min(m.h - viewH, y0));
  const ring = (key?: string, delay = 0) => {
    if (!key) return null;
    const b = m.boxes[key];
    if (!b) return null;
    const o = interpolate(frame, [cue.from + 10 + delay, cue.from + 22 + delay], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const pad = 6;
    return (
      <div
        style={{
          position: 'absolute',
          left: (b.x - cx - pad) * scale,
          top: (b.y - top - pad) * scale,
          width: (b.w + pad * 2) * scale,
          height: (b.h + pad * 2) * scale,
          border: `6px solid ${C.sage}`,
          borderRadius: 22,
          boxShadow: `0 0 0 10px rgba(82,101,71,0.18)`,
          opacity: o,
        }}
      />
    );
  };
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Img
        src={staticFile(m.file)}
        style={{ position: 'absolute', left: -cx * scale, top: -top * scale, width: m.w * scale, height: m.h * scale }}
      />
      {ring(cue.hl)}
      {ring(cue.hl2, 8)}
    </div>
  );
};

export const AppPanel: React.FC<{ cues: ShotCue[]; x: number; y: number }> = ({ cues, x, y }) => {
  const frame = useCurrentFrame();
  const visible = cues.filter((c) => frame >= c.from - 8 && frame < c.to + 8);
  const cur = [...cues].reverse().find((c) => frame >= c.from) ?? cues[0];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: PW, height: PH + 52 }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: PW,
          height: PH,
          borderRadius: 36,
          overflow: 'hidden',
          background: C.bg,
          border: `3px solid ${C.ink}`,
          boxShadow: '0 4px 8px rgba(48,43,37,0.06), 0 30px 70px rgba(48,43,37,0.16)',
        }}
      >
        {visible.map((c, i) => {
          // 겹침(고스트) 없이: 이전 화면이 먼저 빠지고(-8~-2) 새 화면이 들어온다(-2~+6)
          const fin = i === 0 ? 1 : interpolate(frame, [c.from - 2, c.from + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const isLast = c === cues[cues.length - 1];
          const fout = isLast ? 1 : interpolate(frame, [c.to - 8, c.to - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={c.shot + c.from} style={{ position: 'absolute', inset: 0, opacity: Math.min(fin, fout) }}>
              <ShotView cue={c} />
            </div>
          );
        })}
        {cur?.tag && (
          <div style={{ position: 'absolute', right: 20, top: 20, background: C.ink, color: C.surface, fontFamily: FONT, fontWeight: 700, fontSize: 28, padding: '8px 20px', borderRadius: 999 }}>
            {cur.tag}
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', left: 6, top: PH + 14, fontFamily: FONT, fontSize: 24, fontWeight: 600, color: C.muted }}>
        실제 온유 앱 화면 · 가상 시연 데이터
      </div>
    </div>
  );
};
