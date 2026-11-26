import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, FONT_BRAND, PAD_X } from '../theme';
import type { Chunk } from '../timeline';

/** at 프레임부터 부드럽게 등장 (페이드 + 짧은 상승) */
export function useAppear(at: number, dur = 14, dy = 24) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` } as React.CSSProperties;
}

export const Appear: React.FC<{ at: number; dur?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, dur, dy, style, children }) => {
  const s = useAppear(at, dur, dy);
  return <div style={{ ...style, ...s }}>{children}</div>;
};

/** 장면 전체 페이드 인/아웃 */
export const SceneFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10, dur - 9, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ position: 'absolute', inset: 0, opacity: o }}>{children}</div>;
};

export const Header: React.FC<{ eyebrow?: string; title: string; at?: number; width?: number }> = ({ eyebrow, title, at = 0, width = 1680 }) => (
  <div style={{ position: 'absolute', left: PAD_X, top: 92, width }}>
    {eyebrow && (
      <Appear at={at} style={{ fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: '0.22em', color: C.sage, marginBottom: 14 }}>
        {eyebrow}
      </Appear>
    )}
    <Appear at={at + 4} style={{ fontFamily: FONT, fontWeight: 800, fontSize: 72, lineHeight: 1.18, color: C.ink, letterSpacing: '-0.02em' }}>
      {title}
    </Appear>
  </div>
);

/** 앱과 같은 워드마크: 온:遊 | 온유 / ON YOU */
export const Logo: React.FC<{ size?: number; sub?: boolean }> = ({ size = 120, sub = true }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.22, color: C.ink }}>
    <span style={{ fontFamily: FONT_BRAND, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: '-0.01em', display: 'inline-flex', alignItems: 'baseline' }}>
      온<span style={{ color: C.sage, margin: '0 0.03em' }}>:</span>
      <span style={{ fontSize: '1.05em' }}>遊</span>
    </span>
    {sub && (
      <span style={{ display: 'grid', lineHeight: 1.1, borderLeft: `${Math.max(2, size * 0.02)}px solid ${C.lineStrong}`, paddingLeft: size * 0.2, fontFamily: FONT }}>
        <span style={{ fontWeight: 800, fontSize: size * 0.62 }}>온유</span>
        <span style={{ fontWeight: 700, fontSize: size * 0.3, letterSpacing: '0.22em', color: C.ink2 }}>ON YOU</span>
      </span>
    )}
  </div>
);

export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; tone?: 'surface' | 'sage' | 'soft' }> = ({ style, children, tone = 'surface' }) => {
  const bg = tone === 'sage' ? C.sage : tone === 'soft' ? C.sageSoft : C.surface;
  return (
    <div
      style={{
        background: bg,
        color: tone === 'sage' ? '#fff' : C.ink,
        border: tone === 'surface' ? `2px solid ${C.line}` : 'none',
        borderRadius: 28,
        boxShadow: '0 2px 4px rgba(48,43,37,0.04), 0 14px 40px rgba(48,43,37,0.07)',
        fontFamily: FONT,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Pill: React.FC<{ children: React.ReactNode; tone?: 'sage' | 'line' | 'warn'; size?: number; style?: React.CSSProperties }> = ({ children, tone = 'line', size = 30, style }) => (
  <span
    style={{
      display: 'inline-block',
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      padding: `${size * 0.3}px ${size * 0.7}px`,
      borderRadius: 999,
      background: tone === 'sage' ? C.sageSoft : tone === 'warn' ? C.warnSoft : C.surface,
      color: tone === 'sage' ? C.sageDark : tone === 'warn' ? '#6E4A00' : C.ink2,
      border: `2px solid ${tone === 'line' ? C.line : 'transparent'}`,
      ...style,
    }}
  >
    {children}
  </span>
);

/** 하단 자막: 문장의 자막 조각을 실제 음성 시각에 맞춰 표시 */
export const Subtitles: React.FC<{ chunks: Chunk[] }> = ({ chunks }) => {
  const frame = useCurrentFrame();
  const c = chunks.find((k) => frame >= k.from && frame < k.to);
  if (!c) return null;
  const o = interpolate(frame, [c.from, c.from + 4], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 58, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div
        style={{
          maxWidth: 1560,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 44,
          lineHeight: 1.35,
          color: C.surface,
          background: 'rgba(48,43,37,0.86)',
          padding: '12px 34px 14px',
          borderRadius: 18,
          wordBreak: 'keep-all',
        }}
      >
        {c.text}
      </div>
    </div>
  );
};

export const Bg: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(1400px 900px at 78% 18%, ${C.surface} 0%, ${C.bg} 60%)` }} />
);
