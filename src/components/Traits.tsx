import { AXES } from '../data/axes';
import type { Traits } from '../lib/types';

/** 5개 축 오각형 차트 (선택적으로 비교 대상 겹쳐 그리기) */
export function TraitRadar({ traits, compare, size = 240 }: { traits: Traits; compare?: Traits; size?: number }) {
  const c = 120;
  const r = 82;
  const point = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const rr = (r * (v + 12)) / 112; // 0일 때도 점이 중앙에 겹치지 않도록 약간 띄운다
    return [c + Math.cos(a) * rr, c + Math.sin(a) * rr];
  };
  const poly = (t: Traits) => t.map((v, i) => point(i, v).join(',')).join(' ');
  const desc = AXES.map((a, i) => `${a.name} ${a.options.find((o) => o.value === traits[i])!.label}`).join(', ');
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} className="radar" role="img" aria-label={`동행 선호 프로필: ${desc}`}>
      {[0, 50, 100].map((lv) => (
        <polygon key={lv} points={poly([lv, lv, lv, lv, lv] as Traits)} className="radar-grid" />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-grid" />;
      })}
      {compare && <polygon points={poly(compare)} className="radar-compare" />}
      <polygon points={poly(traits)} className="radar-me" />
      {traits.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} cx={x} cy={y} r="4" className="radar-dot" />;
      })}
      {AXES.map((a, i) => {
        const [x, y] = point(i, 132);
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-label">
            {a.name}
          </text>
        );
      })}
    </svg>
  );
}

/** 축별 막대: 내 값과 그룹 값을 같은 줄에 표시 */
export function TraitCompare({ user, group, groupLabel = '그룹' }: { user?: Traits | null; group: Traits; groupLabel?: string }) {
  return (
    <ul className="trait-compare">
      {AXES.map((axis, i) => {
        const diff = user ? Math.abs(user[i] - group[i]) : 0;
        return (
          <li key={axis.key}>
            <div className="tc-head">
              <span className="tc-name">{axis.name}</span>
              <span className="tc-value">{axis.groupStyle[group[i]]}</span>
            </div>
            <div className="tc-track" aria-hidden="true">
              <span className="tc-pole tc-low">{axis.low}</span>
              <span className="tc-line">
                <span className="tc-dot tc-group" style={{ left: `${group[i]}%` }} />
                {user && <span className="tc-dot tc-user" style={{ left: `${user[i]}%` }} />}
              </span>
              <span className="tc-pole tc-high">{axis.high}</span>
            </div>
            <p className="sr-only">
              {groupLabel}: {axis.groupStyle[group[i]]}
              {user && `, 나: ${axis.options.find((o) => o.value === user[i])!.label}`}
            </p>
            {user && diff >= 50 && (
              <p className="tc-diff">
                나는 “{axis.options.find((o) => o.value === user[i])!.label}”, 이 {groupLabel}은 “{axis.groupStyle[group[i]]}”이에요.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function TraitLegend({ groupLabel = '그룹' }: { groupLabel?: string }) {
  return (
    <div className="trait-legend" aria-hidden="true">
      <span><i className="tc-dot tc-user static" /> 나</span>
      <span><i className="tc-dot tc-group static" /> {groupLabel}</span>
    </div>
  );
}
