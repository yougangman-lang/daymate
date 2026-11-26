// E 구간(수업 후 매니저 상담) 조립용 컴포지션.
// 촬영본이 도착하면 public/footage/ 에 넣고 src/data/consult.json 의 clips/inserts/subtitles 를 채운다.
// 실제 촬영 음성을 그대로 쓰며 AI 내레이션은 넣지 않는다. 자막은 실제 음성을 듣고 확인한 문장만 넣는다.
import React from 'react';
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Video } from '@remotion/media';
import data from './data/consult.json';
import { AppPanel } from './components/AppPanel';
import { Bg, Subtitles } from './components/ui';
import { C, FONT, FPS } from './theme';

interface Clip { src: string; trimStart: number; trimEnd: number; question?: string }
interface Insert { clip: number; at: number; dur: number; shot: string; crop: [number, number, number, number]; hl?: string; tag?: string }
interface Sub { clip: number; start: number; end: number; text: string }

const clips = (data as any).clips as Clip[];
const inserts = (data as any).inserts as Insert[];
const subs = (data as any).subtitles as Sub[];
const f = (s: number) => Math.round(s * FPS);

export function clipStarts() {
  let acc = 0;
  return clips.map((c) => {
    const st = acc;
    acc += f(c.trimEnd - c.trimStart);
    return st;
  });
}
export function consultDuration() {
  return Math.max(1, clips.reduce((a, c) => a + f(c.trimEnd - c.trimStart), 0));
}

const Question: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, f(3.6), f(3.6) + 8], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 80, top: 70, opacity: o, fontFamily: FONT }}>
      <div style={{ background: C.surface, borderRadius: 26, padding: '24px 36px', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', maxWidth: 1100 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.sage }}>회원 질문</div>
        <div style={{ fontSize: 52, fontWeight: 800, color: C.ink, marginTop: 6, wordBreak: 'keep-all' }}>“{text}”</div>
      </div>
    </div>
  );
};

/** 앱 화면이 들어오면 촬영 화면을 왼쪽으로 줄이고 오른쪽에 앱을 보여준다 (얼굴만 계속 보이지 않도록) */
export const Consultation: React.FC = () => {
  const frame = useCurrentFrame();
  const starts = clipStarts();
  const ins = inserts.map((i) => ({ ...i, from: starts[i.clip] + f(i.at), to: starts[i.clip] + f(i.at + i.dur) }));
  const active = ins.find((i) => frame >= i.from - 12 && frame < i.to + 12);
  const k = active ? interpolate(frame, [active.from - 12, active.from, active.to, active.to + 12], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const vw = interpolate(k, [0, 1], [1920, 940]);
  const vx = interpolate(k, [0, 1], [0, 70]);
  const vy = interpolate(k, [0, 1], [0, 200]);
  if (!clips.length) {
    return (
      <AbsoluteFill style={{ background: C.bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT, fontSize: 48, color: C.ink }}>
        상담 촬영본 없음 – src/data/consult.json 을 채워 주세요
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Bg />
      <div style={{ position: 'absolute', left: vx, top: vy, width: vw, height: (vw * 9) / 16, borderRadius: k * 28, overflow: 'hidden' }}>
        {clips.map((c, i) => (
          <Sequence key={c.src} from={starts[i]} durationInFrames={f(c.trimEnd - c.trimStart)}>
            <Video src={staticFile(c.src)} trimBefore={f(c.trimStart)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Sequence>
        ))}
      </div>
      {ins.map((i) => (
        <Sequence key={i.shot + i.from} from={i.from - 12} durationInFrames={i.to - i.from + 24}>
          <div style={{ position: 'absolute', left: 1060, top: 40, transform: 'scale(0.86)', transformOrigin: 'top left', opacity: interpolate(frame - (i.from - 12), [0, 12, i.to - i.from + 12, i.to - i.from + 24], [0, 1, 1, 0], { extrapolateRight: 'clamp' }) }}>
            <AppPanel cues={[{ shot: i.shot, crop: i.crop, hl: i.hl, tag: i.tag, from: 12, to: i.to - i.from + 12 }]} x={0} y={0} />
          </div>
        </Sequence>
      ))}
      {clips.map((c, i) =>
        c.question ? (
          <Sequence key={'q' + i} from={starts[i]} durationInFrames={f(4)}>
            <Question text={c.question} />
          </Sequence>
        ) : null,
      )}
      <Subtitles chunks={subs.map((s) => ({ text: s.text, from: starts[s.clip] + f(s.start), to: starts[s.clip] + f(s.end) }))} />
    </AbsoluteFill>
  );
};
