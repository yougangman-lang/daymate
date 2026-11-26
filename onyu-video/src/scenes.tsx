import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { AppPanel, ShotCue } from './components/AppPanel';
import { Appear, Card, Header, Logo, Pill, useAppear } from './components/ui';
import { C, FONT, PAD_X } from './theme';
import { beat, SceneT } from './timeline';

type P = { s: SceneT };
const chunkAt = (s: SceneT, line: number, chunk: number) => {
  const l = s.lines[Math.min(line, s.lines.length - 1)];
  return l.chunks[Math.min(chunk, l.chunks.length - 1)].from;
};

// ---------------- A ----------------
const Hook: React.FC<P> = ({ s }) => {
  const parts = (s.visual.text as string).split('\n');
  const at = [chunkAt(s, 0, 0), chunkAt(s, 0, 1), chunkAt(s, 0, 1) + 10];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      {parts.map((t, i) => (
        <Appear key={i} at={at[i] - 4} dy={18} style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.28, color: i === 1 ? C.sage : C.ink, letterSpacing: '-0.03em' }}>
          {t}
        </Appear>
      ))}
    </div>
  );
};

const ICON: Record<string, string> = { badge: '자격', tune: '조정', note: '기록' };
const Problem: React.FC<P> = ({ s }) => {
  const v = s.visual;
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 330, display: 'flex', gap: 36 }}>
        {v.cards.map((c: any, i: number) => (
          <Appear key={i} at={chunkAt(s, 0, 1) + i * 9}>
            <Card style={{ width: 536, height: 270, padding: '40px 44px' }}>
              <div style={{ display: 'inline-block', fontSize: 26, fontWeight: 800, color: C.sage, background: C.sageSoft, borderRadius: 12, padding: '6px 16px' }}>{ICON[c.icon]}</div>
              <div style={{ fontSize: 50, fontWeight: 800, marginTop: 26, letterSpacing: '-0.02em' }}>{c.title}</div>
              <div style={{ fontSize: 34, color: C.muted, marginTop: 14, fontWeight: 500 }}>{c.body}</div>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear at={beat(s, 1)} style={{ position: 'absolute', left: PAD_X, top: 650 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30, fontFamily: FONT }}>
          <span style={{ fontSize: 120, fontWeight: 800, color: C.sage, letterSpacing: '-0.03em' }}>{v.stat.value}</span>
          <span style={{ fontSize: 44, fontWeight: 700, color: C.ink }}>{v.stat.label}</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 26, color: C.muted, marginTop: 2 }}>출처: {v.stat.source}</div>
      </Appear>
    </>
  );
};

const Origin: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const at = [chunkAt(s, 0, 0), chunkAt(s, 0, 1), beat(s, 1)];
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 320, width: 1680 }}>
        {v.points.map((p: any, i: number) => (
          <Appear key={i} at={at[i]} style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '26px 0', borderBottom: `2px solid ${C.line}`, fontFamily: FONT }}>
            <span style={{ width: 230, fontSize: 34, fontWeight: 700, color: C.sage }}>{p.k}</span>
            <span style={{ fontSize: 50, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>{p.v}</span>
          </Appear>
        ))}
      </div>
      <Appear at={beat(s, 2)} style={{ position: 'absolute', left: PAD_X, top: 690 }}>
        <Card tone="sage" style={{ padding: '30px 48px', display: 'flex', alignItems: 'center', gap: 28 }}>
          <span style={{ fontSize: 34, fontWeight: 700, opacity: 0.9 }}>온유의 답</span>
          <span style={{ fontSize: 48, fontWeight: 800 }}>{v.answer}</span>
        </Card>
      </Appear>
    </>
  );
};

// ---------------- B ----------------
const Brand: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const frame = useCurrentFrame();
  const sc = interpolate(frame, [0, s.dur], [1, 1.04]);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <Appear at={4} dur={22} dy={10} style={{ transform: `scale(${sc})` }}>
        <Logo size={170} />
      </Appear>
      <Appear at={chunkAt(s, 0, 0) + 30} style={{ fontSize: 76, fontWeight: 800, marginTop: 70, color: C.ink, letterSpacing: '-0.02em' }}>
        {v.slogan}
      </Appear>
      <Appear at={beat(s, 1)} style={{ marginTop: 40, display: 'flex', gap: 20, alignItems: 'center' }}>
        <Pill tone="sage" size={36}>{v.badge}</Pill>
        <span style={{ fontSize: 40, color: C.muted, fontWeight: 600 }}>{v.sub}</span>
      </Appear>
    </div>
  );
};

const Target: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const box = (d: any, tone: 'sage' | 'surface', w: number) => (
    <Card tone={tone} style={{ width: w, height: 470, padding: '52px 60px' }}>
      <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.9 }}>{d.tag}</div>
      <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10, lineHeight: 1.1 }}>{d.age}</div>
      <div style={{ fontSize: 42, fontWeight: 600, marginTop: 26, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{d.body}</div>
    </Card>
  );
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 330, display: 'flex', gap: 40 }}>
        <Appear at={chunkAt(s, 0, 1) - 6}>{box(v.primary, 'sage', 940)}</Appear>
        <Appear at={beat(s, 1)}>{box(v.secondary, 'surface', 700)}</Appear>
      </div>
    </>
  );
};

const Person: React.FC<{ kind: 'm' | 'c' | 'g'; at: number; label?: string }> = ({ kind, at, label }) => {
  const st = useAppear(at, 12, 14);
  const bg = kind === 'g' ? C.ink : kind === 'c' ? C.sage : C.surface;
  const fg = kind === 'm' ? C.ink : '#fff';
  return (
    <div style={{ ...st, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, fontFamily: FONT }}>
      <div style={{ width: 96, height: 96, borderRadius: 999, background: bg, border: kind === 'm' ? `3px solid ${C.lineStrong}` : 'none', display: 'grid', placeItems: 'center', color: fg, fontWeight: 800, fontSize: 30 }}>
        {kind === 'g' ? 'M' : kind === 'c' ? 'C' : ''}
      </div>
      {label && <div style={{ fontSize: 28, fontWeight: 700, color: C.ink2 }}>{label}</div>}
    </div>
  );
};

const Team: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const a0 = chunkAt(s, 0, 0);
  const a1 = chunkAt(s, 0, 1);
  const group = (gi: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '26px 28px', borderRadius: 28, background: 'rgba(227,232,216,0.55)' }}>
      <Person kind="c" at={a1 + gi * 6} label="코치" />
      <div style={{ display: 'flex', gap: 18 }}>
        {[0, 1, 2].map((i) => <Person key={i} kind="m" at={a0 + (gi * 3 + i) * 3} />)}
      </div>
    </div>
  );
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 318, width: 760, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <Person kind="g" at={a1 + 14} label="매니저" />
        <div style={{ display: 'flex', gap: 30 }}>{group(0)}{group(1)}</div>
        <Appear at={a0 + 6} style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.muted }}>회원 최대 6명</Appear>
      </div>
      <div style={{ position: 'absolute', left: 960, top: 330, width: 840, fontFamily: FONT }}>
        {v.roles.map((r: any, i: number) => (
          <Appear key={i} at={beat(s, 1) + i * chunkLen(s, 1)} style={{ padding: '20px 0', borderBottom: `2px solid ${C.line}` }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: C.sage }}>{r.who}</div>
            <div style={{ fontSize: 36, fontWeight: 600, marginTop: 6 }}>{r.what}</div>
          </Appear>
        ))}
        <Appear at={beat(s, 2)} style={{ marginTop: 34 }}>
          <Card style={{ padding: '26px 34px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>{v.qual.title}</div>
            {v.qual.rows.map((r: string[], i: number) => (
              <div key={i} style={{ display: 'flex', gap: 22, marginTop: 14, fontSize: 32, lineHeight: 1.35 }}>
                <span style={{ width: 110, fontWeight: 800, flexShrink: 0 }}>{r[0]}</span>
                <span style={{ fontWeight: 600, whiteSpace: 'pre-line' }}>{r[1]}</span>
              </div>
            ))}
          </Card>
        </Appear>
      </div>
    </>
  );
};
function chunkLen(s: SceneT, line: number) {
  const l = s.lines[line];
  return l.chunks.length > 1 ? l.chunks[1].from - l.chunks[0].from : 20;
}

const Flow60: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const total = 60;
  const width = 1680;
  const at = [chunkAt(s, 0, 0), chunkAt(s, 0, 1), chunkAt(s, 1, 0), chunkAt(s, 1, 1)];
  const widths = [520, 520, 410, 230]; // 5분 블록도 글씨가 들어가도록 최소 폭 보장
  let x = 0;
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 360, width, height: 300, fontFamily: FONT }}>
        {v.blocks.map((b: any, i: number) => {
          const w = widths[i] ?? (b.min / total) * width;
          const left = x;
          x += w;
          const game = i === 2;
          return (
            <Appear key={i} at={at[i]} dy={0} style={{ position: 'absolute', left, top: 0, width: w - 10 }}>
              <div style={{ height: 210, borderRadius: 24, background: game ? C.sage : i === 1 ? C.sageSoft : C.surface, border: game || i === 1 ? 'none' : `2px solid ${C.line}`, color: game ? '#fff' : C.ink, padding: '26px 28px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.02em' }}>{b.min}분</div>
                <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8 }}>{b.label}</div>
              </div>
              {b.sub && <div style={{ fontSize: 30, fontWeight: 600, color: C.muted, marginTop: 14 }}>{b.sub}</div>}
            </Appear>
          );
        })}
      </div>
      <Appear at={chunkAt(s, 2, 0)} style={{ position: 'absolute', left: PAD_X, top: 680, display: 'flex', gap: 24, alignItems: 'center', fontFamily: FONT }}>
        <Pill size={34}>개인별 무게·횟수·휴식 조정</Pill>
      </Appear>
      <Appear at={chunkAt(s, 2, 1)} style={{ position: 'absolute', left: PAD_X + 560, top: 680, fontFamily: FONT }}>
        <Pill tone="sage" size={34}>→ {v.after}</Pill>
      </Appear>
    </>
  );
};

// ---------------- C: 앱 ----------------
const AppScene: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const cues: ShotCue[] = v.shots.map((sh: any, i: number) => {
    const l = s.lines[sh.line];
    const from = sh.at ? l.from + Math.round(l.dur * sh.at) : i === 0 ? 0 : l.from - 4;
    const nxt = v.shots[i + 1];
    let to = s.dur;
    if (nxt) {
      const nl = s.lines[nxt.line];
      to = nxt.at ? nl.from + Math.round(nl.dur * nxt.at) : nl.from - 4;
    }
    return { shot: sh.shot, crop: sh.crop, hl: sh.hl, hl2: sh.hl2, tag: sh.tag, from, to };
  });
  return (
    <>
      <div style={{ position: 'absolute', left: PAD_X, top: 120, width: 720, fontFamily: FONT }}>
        <Appear at={0} style={{ fontWeight: 800, fontSize: 26, letterSpacing: '0.22em', color: C.sage, marginBottom: 14 }}>{v.eyebrow}</Appear>
        <Appear at={4} style={{ fontWeight: 800, fontSize: 70, lineHeight: 1.2, letterSpacing: '-0.02em', color: C.ink }}>{v.title}</Appear>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 52, alignItems: 'flex-start' }}>
          {(v.chips ?? []).map((c: string, i: number) => {
            const ln = Math.min(i + (s.id === 'C1_facility' ? 1 : 0), s.lines.length - 1);
            const at = s.id === 'C1_facility' ? (i === 3 ? s.lines[3].from + Math.round(s.lines[3].dur * 0.55) : beat(s, ln)) : beat(s, Math.min(i, s.lines.length - 1));
            return (
              <Appear key={c} at={at}>
                <Pill tone="sage" size={36}>{c}</Pill>
              </Appear>
            );
          })}
        </div>
        {v.note && (
          <Appear at={10} style={{ marginTop: 40, fontSize: 28, fontWeight: 600, color: C.muted, lineHeight: 1.4 }}>※ {v.note}</Appear>
        )}
      </div>
      <Appear at={0} dy={0} dur={10}>
        <AppPanel cues={cues} x={900} y={62} />
      </Appear>
    </>
  );
};

// ---------------- D 안내 ----------------
const Bridge: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, s.dur], [1.06, 1.12]);
  return (
    <>
      <Img src={staticFile('footage/class_still.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) saturate(0.8)', transform: `scale(${z})` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(246,240,230,0.80)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center' }}>
        <Card style={{ width: 1300, padding: '56px 72px' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.22em', color: C.sage }}>CLASS</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 10 }}>{v.title}</div>
          <div style={{ marginTop: 34 }}>
            {v.rows.map((r: string[], i: number) => (
              <Appear key={i} at={8 + i * 8} style={{ display: 'flex', gap: 30, padding: '18px 0', borderTop: `2px solid ${C.line}`, fontSize: 38, lineHeight: 1.35 }}>
                <span style={{ width: 300, fontWeight: 800, color: C.sage, flexShrink: 0 }}>{r[0]}</span>
                <span style={{ fontWeight: 600 }}>{r[1]}</span>
              </Appear>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

// ---------------- F ----------------
const Compare: React.FC<P> = ({ s }) => {
  const v = s.visual;
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 320, width: 760, fontFamily: FONT }}>
        {v.others.map((o: any, i: number) => (
          <Appear key={i} at={i === 0 ? chunkAt(s, 0, 0) : i === 1 ? chunkAt(s, 0, 1) : chunkAt(s, 0, 1) + 20} style={{ marginBottom: 22 }}>
            <Card style={{ padding: '24px 34px' }}>
              <div style={{ fontSize: 40, fontWeight: 800 }}>{o.name}</div>
              <div style={{ fontSize: 32, fontWeight: 600, color: C.muted, marginTop: 6 }}>{o.v}</div>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear at={beat(s, 1)} style={{ position: 'absolute', left: 940, top: 320 }}>
        <Card tone="sage" style={{ width: 860, padding: '40px 52px' }}>
          <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.9 }}>온유가 집중하는 것</div>
          {v.ours.map((o: string, i: number) => (
            <Appear key={o} at={beat(s, 1) + 6 + i * 14} style={{ fontSize: 48, fontWeight: 800, marginTop: 24, display: 'flex', gap: 20 }}>
              <span style={{ opacity: 0.75 }}>0{i + 1}</span>
              <span>{o}</span>
            </Appear>
          ))}
        </Card>
      </Appear>
    </>
  );
};

const Staff: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const t0 = 7.5 * 60;
  const t1 = 18.5 * 60;
  const X = 340;
  const WD = 1440;
  const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
  const px = (t: string | number) => X + (((typeof t === 'number' ? t : toMin(t)) - t0) / (t1 - t0)) * WD;
  const rowY = [330, 440, 600, 710];
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
        {/* 시간 눈금 */}
        {[8, 10, 12, 14, 16, 18].map((h) => (
          <div key={h} style={{ position: 'absolute', left: px(h * 60) - 40, top: 268, width: 80, textAlign: 'center', fontSize: 26, fontWeight: 600, color: C.muted }}>{h}시</div>
        ))}
        {v.managers.map((m: any, i: number) => (
          <Appear key={i} at={chunkAt(s, 0, 0) + i * 10}>
            <div style={{ position: 'absolute', left: PAD_X, top: rowY[i] + 16, fontSize: 34, fontWeight: 800 }}>{m.label}</div>
            <div style={{ position: 'absolute', left: px(m.from), top: rowY[i], width: px(m.to) - px(m.from), height: 80, borderRadius: 18, background: C.ink, color: C.surface, fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', paddingLeft: 24, boxSizing: 'border-box' }}>
              {m.from}~{m.to}
            </div>
          </Appear>
        ))}
        {v.coaches.map((c: any, i: number) => (
          <Appear key={i} at={beat(s, 1) + i * 12}>
            <div style={{ position: 'absolute', left: PAD_X, top: rowY[2 + i] + 16, fontSize: 32, fontWeight: 800, color: C.sage }}>{c.label}</div>
            {c.slots.map((k: number) => {
              const st = toMin(v.times[k]);
              return (
                <div key={k} style={{ position: 'absolute', left: px(st), top: rowY[2 + i], width: px(st + 60) - px(st) - 6, height: 80, borderRadius: 16, background: C.sage, color: '#fff', fontSize: 26, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                  {v.times[k]}
                </div>
              );
            })}
          </Appear>
        ))}
        <Appear at={beat(s, 1) + 30} style={{ position: 'absolute', left: PAD_X, top: 830, fontSize: 32, fontWeight: 700, color: C.ink2 }}>{v.foot}</Appear>
      </div>
    </>
  );
};

const Promo: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const stepsAt = (i: number) => {
    const l2 = s.lines[2];
    return l2.from + Math.round((l2.dur * i) / 5);
  };
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <Appear at={chunkAt(s, 0, 1)} style={{ position: 'absolute', right: PAD_X, top: 150, display: 'flex', gap: 16, fontFamily: FONT }}>
        <Pill size={30}>알리는 대상: 자녀 세대</Pill>
        <Pill tone="sage" size={30}>이용하는 사람: 부모 세대</Pill>
      </Appear>
      <div style={{ position: 'absolute', left: PAD_X, top: 320, display: 'flex', gap: 24, fontFamily: FONT }}>
        {v.channels.map((c: any, i: number) => (
          <Appear key={c.id} at={beat(s, 1) + i * 6}>
            <Card style={{ width: 402, padding: '26px 32px' }}>
              <div style={{ fontSize: 44, fontWeight: 800 }}>{c.name}</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: C.muted, marginTop: 4 }}>{c.id}</div>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear at={beat(s, 1) + 20} style={{ position: 'absolute', left: PAD_X, top: 486, fontFamily: FONT, fontSize: 28, fontWeight: 600, color: C.muted }}>
        {v.channelNote} · 팔로워·성과 수치는 확인 전이라 표기하지 않음
      </Appear>
      <div style={{ position: 'absolute', left: PAD_X, top: 580, display: 'flex', alignItems: 'stretch', fontFamily: FONT }}>
        {v.steps.map((t: string, i: number) => (
          <React.Fragment key={t}>
            <Appear at={stepsAt(i)}>
              <div style={{ width: 300, height: 190, borderRadius: 24, background: i < 2 ? C.surface : i === 4 ? C.sage : C.sageSoft, border: i < 2 ? `2px solid ${C.line}` : 'none', color: i === 4 ? '#fff' : C.ink, padding: '22px 24px', boxSizing: 'border-box' }}>
                <div style={{ fontSize: 28, fontWeight: 800, opacity: 0.7 }}>{i + 1}</div>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.3, marginTop: 6, wordBreak: 'keep-all' }}>{t}</div>
              </div>
            </Appear>
            {i < 4 && (
              <Appear at={stepsAt(i) + 6} style={{ width: 45, display: 'grid', placeItems: 'center', fontSize: 40, fontWeight: 800, color: C.lineStrong }}>›</Appear>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

const Budget: React.FC<P> = ({ s }) => {
  const v = s.visual;
  const at = [beat(s, 0), beat(s, 1), beat(s, 2)];
  return (
    <>
      <Header eyebrow={v.eyebrow} title={v.title} />
      <div style={{ position: 'absolute', left: PAD_X, top: 320, display: 'flex', gap: 32, fontFamily: FONT }}>
        {v.big.map((b: any, i: number) => (
          <Appear key={i} at={at[i]}>
            <Card tone={i === 2 ? 'soft' : 'surface'} style={{ width: 538, height: 460, padding: '40px 42px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: C.muted }}>{b.label}</div>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, whiteSpace: 'nowrap', color: i === 2 ? C.sageDark : C.ink }}>{b.value}</div>
              <div style={{ fontSize: 27, fontWeight: 500, color: C.ink2, marginTop: 26, lineHeight: 1.5, wordBreak: 'keep-all' }}>{b.detail}</div>
            </Card>
          </Appear>
        ))}
      </div>
      <Appear at={at[2] + 20} style={{ position: 'absolute', left: PAD_X, top: 808, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.accent }}>
        ※ {v.foot}
      </Appear>
    </>
  );
};

// ---------------- G ----------------
const Message: React.FC<P> = ({ s }) => {
  const v = s.visual;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      {v.lines.map((t: string, i: number) => (
        <Appear key={i} at={chunkAt(s, 0, i) - 4} style={{ fontSize: 100, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.03em', color: i === 1 ? C.sage : C.ink }}>
          {t}
        </Appear>
      ))}
      <Appear at={beat(s, 1)} style={{ marginTop: 60 }}>
        <Logo size={84} />
      </Appear>
    </div>
  );
};

const EndCard: React.FC<P> = ({ s }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <Appear at={0} style={{ position: 'absolute', left: PAD_X, top: 110 }}>
      <Logo size={110} />
      <div style={{ fontSize: 58, fontWeight: 800, marginTop: 34, letterSpacing: '-0.02em' }}>함께 움직이는 즐거움</div>
    </Appear>
    <div style={{ position: 'absolute', left: PAD_X, top: 420, width: 980 }}>
      <Appear at={beat(s, 0)}>
        <Card tone="sage" style={{ padding: '28px 40px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 34, fontWeight: 700, opacity: 0.9 }}>신규</span>
          <span style={{ fontSize: 56, fontWeight: 800 }}>2회 무료체험</span>
        </Card>
      </Appear>
      <Appear at={beat(s, 0) + 10} style={{ marginTop: 22 }}>
        <Card style={{ padding: '26px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 36 }}>
            <span style={{ fontSize: 54, fontWeight: 800 }}>월 49만 원</span>
            <span style={{ fontSize: 54, fontWeight: 800 }}>3개월 139만 원</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, color: C.muted, marginTop: 8 }}>부가세 포함 · 예약제 무제한(정원 내 예약)</div>
        </Card>
      </Appear>
    </div>
    <Appear at={beat(s, 1) - 30} style={{ position: 'absolute', left: 1240, top: 150 }}>
      <div style={{ width: 560, background: '#fff', borderRadius: 28, padding: 40, boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(48,43,37,0.12)', textAlign: 'center' }}>
        <Img src={staticFile('qr.png')} style={{ width: 480, height: 480, imageRendering: 'pixelated', display: 'block' }} />
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 18 }}>온유 앱 둘러보기</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: C.muted, marginTop: 4 }}>daymate-onyu.vercel.app</div>
      </div>
    </Appear>
    <Appear at={beat(s, 1) + 70} style={{ position: 'absolute', left: PAD_X, top: 836, width: 1680, borderTop: `2px solid ${C.line}`, paddingTop: 26, display: 'flex', gap: 40, alignItems: 'baseline' }}>
      <span style={{ fontSize: 30, fontWeight: 800, color: C.sage }}>기획·제작</span>
      <span style={{ fontSize: 36, fontWeight: 700 }}>변지원 · 이현석 · 기윤재 · 정연태</span>
      <span style={{ fontSize: 26, fontWeight: 600, color: C.muted }}>2026-2 여가레크리에이션교육론</span>
    </Appear>
  </div>
);

export const SCENES: Record<string, React.FC<P>> = {
  hook: Hook,
  problem: Problem,
  origin: Origin,
  brand: Brand,
  target: Target,
  team: Team,
  flow60: Flow60,
  app: AppScene,
  bridge: Bridge,
  compare: Compare,
  staff: Staff,
  promo: Promo,
  budget: Budget,
  message: Message,
  endcard: EndCard,
};

/** 자막을 띄우지 않는 장면 (화면 문구가 곧 내레이션) */
export const NO_SUBS = new Set(['hook', 'message', 'brand']);
