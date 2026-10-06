/**
 * 활동별 일러스트. 외부 사진 대신 직접 제작한 SVG 시각 요소를 사용한다 (저작권 확인 불필요).
 */
import type { ReactElement } from 'react';
import type { CategoryId } from '../lib/types';

interface Props {
  category: CategoryId;
  /** 같은 카테고리 안에서 색감을 조금씩 바꾸기 위한 값 */
  variant?: number;
  className?: string;
  label?: string;
}

export const CATEGORY_COLORS: Record<CategoryId, { bg1: string; bg2: string; accent: string; ink: string }> = {
  baseball: { bg1: '#14204a', bg2: '#2b4bb3', accent: '#d7ff3e', ink: '#ffffff' },
  soccer: { bg1: '#0e5132', bg2: '#1f9d5a', accent: '#ffffff', ink: '#ffffff' },
  shopping: { bg1: '#ff7aa8', bg2: '#ffc56e', accent: '#2d1b4e', ink: '#2d1b4e' },
  exhibition: { bg1: '#efe9df', bg2: '#d9cfc0', accent: '#ff5a36', ink: '#1f1f1f' },
  performance: { bg1: '#1b0b3a', bg2: '#6b21a8', accent: '#ff4fd8', ink: '#ffffff' },
  movie: { bg1: '#2a0a0f', bg2: '#8f1d2c', accent: '#ffd23f', ink: '#ffffff' },
  food: { bg1: '#ffb547', bg2: '#ff7a3d', accent: '#3a1f0b', ink: '#3a1f0b' },
  picnic: { bg1: '#8fd3ff', bg2: '#c9f0c5', accent: '#ff6b5a', ink: '#17402a' },
};

export function CategoryArt({ category, variant = 0, className, label }: Props) {
  const c = CATEGORY_COLORS[category];
  const gid = `g-${category}-${variant}`;
  const shift = (variant % 3) * 18;
  return (
    <svg
      className={className}
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.bg1} />
          <stop offset="1" stopColor={c.bg2} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${gid})`} />
      {SCENES[category](c, shift)}
    </svg>
  );
}

type Colors = (typeof CATEGORY_COLORS)[CategoryId];

const SCENES: Record<CategoryId, (c: Colors, shift: number) => ReactElement> = {
  baseball: (c, s) => (
    <g>
      {/* 조명탑 */}
      {[40 + s, 280 - s].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="20" width="4" height="70" fill="#ffffff22" />
          <rect x={x - 14} y="14" width="28" height="12" rx="3" fill="#fff" opacity="0.9" />
          <path d={`M${x - 14} 26 L${x - 60} 120 L${x + 60} 120 L${x + 14} 26Z`} fill="#ffffff" opacity="0.07" />
        </g>
      ))}
      {/* 관중석 */}
      <path d="M0 110 Q160 70 320 110 L320 130 L0 130Z" fill="#0b1433" opacity="0.6" />
      {Array.from({ length: 26 }).map((_, i) => (
        <circle key={i} cx={8 + i * 12} cy={110 - Math.sin((i / 25) * Math.PI) * 26 + 6} r="2.4" fill={i % 4 === 0 ? c.accent : '#ffffff55'} />
      ))}
      {/* 그라운드 */}
      <path d="M0 130 Q160 115 320 130 L320 200 L0 200Z" fill="#1f8a4c" />
      <path d="M160 128 L230 165 L160 200 L90 165Z" fill="#c98a4b" />
      <path d="M160 140 L208 165 L160 190 L112 165Z" fill="#2aa35d" />
      {[[160, 128], [230, 165], [90, 165]].map(([x, y]) => (
        <rect key={`${x}`} x={x - 4} y={y - 4} width="8" height="8" fill="#fff" transform={`rotate(45 ${x} ${y})`} />
      ))}
      {/* 공 */}
      <g transform="translate(250 60)">
        <circle r="18" fill="#fff" />
        <path d="M-10 -14 Q-2 0 -10 14 M10 -14 Q2 0 10 14" stroke="#e5484d" strokeWidth="2" fill="none" />
      </g>
    </g>
  ),
  soccer: (c, s) => (
    <g>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 40} y="0" width="20" height="200" fill="#ffffff" opacity="0.05" />
      ))}
      <g stroke={c.accent} strokeWidth="3" fill="none" opacity="0.85">
        <rect x="14" y="14" width="292" height="172" rx="2" />
        <line x1="160" y1="14" x2="160" y2="186" />
        <circle cx="160" cy="100" r="34" />
        <rect x="14" y="60" width="44" height="80" />
        <rect x="262" y="60" width="44" height="80" />
      </g>
      <circle cx="160" cy="100" r="4" fill={c.accent} />
      <g transform={`translate(${200 + s} 120)`}>
        <circle r="20" fill="#fff" />
        <path d="M0 -8 L8 -2 L5 8 L-5 8 L-8 -2Z" fill="#111" />
        <path d="M0 -8 L0 -20 M8 -2 L19 -6 M5 8 L12 17 M-5 8 L-12 17 M-8 -2 L-19 -6" stroke="#111" strokeWidth="2" />
      </g>
    </g>
  ),
  shopping: (c, s) => (
    <g>
      {/* 가게 차양 */}
      <g transform="translate(30 30)">
        <rect x="0" y="30" width="160" height="110" fill="#fff" opacity="0.85" rx="6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M${i * 20} 0 h20 v30 a10 10 0 0 1 -20 0Z`} fill={i % 2 ? '#fff' : c.accent} />
        ))}
        <rect x="16" y="56" width="58" height="84" rx="4" fill={c.bg1} opacity="0.5" />
        <rect x="88" y="56" width="56" height="40" rx="4" fill={c.bg2} opacity="0.7" />
      </g>
      {/* 쇼핑백 */}
      <g transform={`translate(${200 + s / 2} 70)`}>
        <rect x="0" y="20" width="56" height="70" rx="6" fill={c.accent} />
        <path d="M14 22 v-10 a14 14 0 0 1 28 0 v10" stroke={c.accent} strokeWidth="5" fill="none" />
        <rect x="40" y="40" width="48" height="60" rx="6" fill="#fff" />
        <path d="M52 42 v-8 a12 12 0 0 1 24 0 v8" stroke="#fff" strokeWidth="5" fill="none" />
        <circle cx="64" cy="70" r="9" fill="#ff7aa8" />
      </g>
      <circle cx="285" cy="35" r="10" fill="#fff" opacity="0.6" />
      <circle cx="300" cy="60" r="5" fill="#fff" opacity="0.6" />
    </g>
  ),
  exhibition: (c, s) => (
    <g>
      <rect x="0" y="150" width="320" height="50" fill="#c8bba7" />
      <rect x="0" y="148" width="320" height="4" fill="#b5a68f" />
      {/* 액자 1: 추상 */}
      <g transform={`translate(${36 + s / 3} 34)`}>
        <rect width="96" height="96" fill="#1f1f1f" />
        <rect x="6" y="6" width="84" height="84" fill="#faf7f2" />
        <circle cx="38" cy="44" r="22" fill={c.accent} />
        <rect x="50" y="22" width="30" height="50" fill="#2b4bb3" opacity="0.85" />
        <path d="M14 78 Q48 56 82 80" stroke="#1f1f1f" strokeWidth="3" fill="none" />
      </g>
      {/* 액자 2 */}
      <g transform="translate(160 50)">
        <rect width="70" height="56" fill="#1f1f1f" />
        <rect x="5" y="5" width="60" height="46" fill="#ffd23f" />
        <path d="M5 40 L25 24 L40 36 L52 20 L65 32 L65 51 L5 51Z" fill="#1f9d5a" />
      </g>
      <g transform="translate(248 40)">
        <rect width="44" height="76" fill="#1f1f1f" />
        <rect x="4" y="4" width="36" height="68" fill="#efe9df" />
        <line x1="10" y1="14" x2="34" y2="62" stroke={c.accent} strokeWidth="4" />
      </g>
      {/* 조명과 벤치 */}
      {[84, 195, 270].map((x) => (
        <path key={x} d={`M${x - 6} 0 h12 l14 30 h-40Z`} fill="#fff" opacity="0.35" />
      ))}
      <rect x="120" y="160" width="90" height="10" rx="3" fill="#6b5b45" />
      <rect x="128" y="170" width="6" height="16" fill="#6b5b45" />
      <rect x="196" y="170" width="6" height="16" fill="#6b5b45" />
    </g>
  ),
  performance: (c, s) => (
    <g>
      {[60, 160, 260].map((x, i) => (
        <path key={x} d={`M${x} 0 L${x - 60 + s} 160 L${x + 60 + s} 160Z`} fill={i === 1 ? c.accent : '#ffffff'} opacity={i === 1 ? 0.28 : 0.12} />
      ))}
      <rect x="40" y="120" width="240" height="14" rx="3" fill="#0a0420" />
      {/* 무대 위 마이크 */}
      <g transform="translate(160 70)">
        <rect x="-2" y="10" width="4" height="40" fill="#e5e5e5" />
        <rect x="-8" y="-6" width="16" height="22" rx="8" fill="#e5e5e5" />
      </g>
      {/* 관객 실루엣 */}
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 10 + i * 23;
        const h = 18 + ((i * 7) % 12);
        return (
          <g key={i} fill="#0a0420">
            <circle cx={x} cy={200 - h - 30} r="11" />
            <rect x={x - 14} y={200 - h - 20} width="28" height={h + 30} rx="12" />
            {i % 3 === 0 && <rect x={x + 6} y={200 - h - 62} width="5" height="34" rx="2" transform={`rotate(-12 ${x} ${200 - h})`} />}
          </g>
        );
      })}
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} cx={20 + i * 31} cy={20 + ((i * 13) % 40)} r="1.8" fill="#fff" opacity="0.7" />
      ))}
    </g>
  ),
  movie: (c, s) => (
    <g>
      <rect x="40" y="20" width="240" height="96" rx="6" fill="#fff4d6" opacity="0.92" />
      <path d="M40 116 L0 180 L320 180 L280 116Z" fill="#fff4d6" opacity="0.08" />
      <circle cx={130 + s} cy="64" r="22" fill={c.accent} opacity="0.85" />
      <path d="M60 106 L120 70 L160 96 L200 60 L260 106Z" fill={c.bg2} opacity="0.6" />
      {[150, 172].map((y, row) => (
        <g key={y}>
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x={14 + row * 10 + i * 34} y={y} width="28" height="24" rx="7" fill="#5c0f1b" />
          ))}
        </g>
      ))}
      <g transform="translate(268 128)">
        <path d="M0 10 L30 10 L26 50 L4 50Z" fill="#fff" />
        <path d="M0 10 L30 10 L26 50 L4 50Z" fill="none" stroke="#e5484d" strokeWidth="3" strokeDasharray="4 4" />
        {[4, 12, 20, 26, 8, 18].map((x, i) => (
          <circle key={i} cx={x + 2} cy={i < 4 ? 6 : 0} r="6" fill="#ffe8a3" />
        ))}
      </g>
    </g>
  ),
  food: (c, s) => (
    <g>
      <rect x="0" y="130" width="320" height="70" fill="#7a3e14" opacity="0.35" />
      <ellipse cx={120 + s / 2} cy="135" rx="78" ry="16" fill="#fff" opacity="0.9" />
      <path d={`M${50 + s / 2} 120 a70 44 0 0 0 140 0Z`} fill="#fff" />
      <path d={`M${58 + s / 2} 120 a62 36 0 0 0 124 0Z`} fill="#ffe8c2" />
      <circle cx={95 + s / 2} cy="118" r="10" fill="#ff5a36" />
      <circle cx={130 + s / 2} cy="114" r="8" fill="#1f9d5a" />
      <circle cx={155 + s / 2} cy="120" r="9" fill="#ffd23f" />
      {[100, 125, 150].map((x) => (
        <path key={x} d={`M${x + s / 2} 92 q-8 -12 0 -24 q8 -12 0 -24`} stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" />
      ))}
      {/* 커피잔 */}
      <g transform="translate(230 86)">
        <rect x="0" y="10" width="50" height="50" rx="10" fill="#fff" />
        <path d="M50 22 a12 12 0 0 1 0 24" stroke="#fff" strokeWidth="7" fill="none" />
        <ellipse cx="25" cy="14" rx="21" ry="6" fill={c.accent} />
        <ellipse cx="25" cy="64" rx="36" ry="6" fill="#fff" opacity="0.8" />
      </g>
    </g>
  ),
  picnic: (c, s) => (
    <g>
      <circle cx={260 - s} cy="44" r="24" fill="#fff3a6" />
      <path d="M0 120 Q80 80 170 116 Q240 90 320 112 L320 200 L0 200Z" fill="#7cc77e" />
      <path d="M0 150 Q120 120 320 150 L320 200 L0 200Z" fill="#5fb262" />
      {/* 나무 */}
      <g transform="translate(60 56)">
        <rect x="-5" y="40" width="10" height="56" fill="#7a4a2a" />
        <circle cx="0" cy="30" r="30" fill="#2f8f4a" />
        <circle cx="-18" cy="44" r="18" fill="#3aa357" />
        <circle cx="18" cy="44" r="18" fill="#3aa357" />
      </g>
      {/* 돗자리 */}
      <g transform="translate(150 140) skewX(-30)">
        {Array.from({ length: 4 }).map((_, r) =>
          Array.from({ length: 6 }).map((__, col) => (
            <rect key={`${r}-${col}`} x={col * 16} y={r * 9} width="16" height="9" fill={(r + col) % 2 ? '#fff' : c.accent} />
          )),
        )}
      </g>
      <g transform="translate(250 128)">
        <rect x="0" y="0" width="28" height="20" rx="4" fill="#ffd23f" />
        <path d="M4 0 a10 8 0 0 1 20 0" stroke="#7a4a2a" strokeWidth="3" fill="none" />
      </g>
      <path d="M120 40 q8 -6 16 0 q8 -6 16 0" stroke="#fff" strokeWidth="3" fill="none" />
    </g>
  ),
};
