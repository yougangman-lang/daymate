// 자세한 결과 보기: 시연용 결과표 + 지난 기록 (인쇄 가능). 공식 인바디 결과지가 아니다.
import { useAppState } from '../../store/store';
import { displayName, findMember, memberMeasurements } from '../../domain/selectors';
import { METRICS } from '../../domain/metrics';
import type { BodyValues, Measurement } from '../../domain/types';
import { formatDate, formatDateShort, formatDateTime, seoulDate } from '../../lib/time';
import { Empty, PageHead, PageNav } from '../../components/ui';

const EXPL_LABEL = { pending: '설명 확인 전', draft: '온유 담당자 확인 중', published: '설명 공개됨' } as const;

function TrendChart({ list, metric }: { list: Measurement[]; metric: keyof BodyValues }) {
  const def = METRICS.find((m) => m.key === metric)!;
  const pts = [...list].reverse();
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.values[metric]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(0.5, (max - min) * 0.4);
  const lo = min - pad;
  const hi = max + pad;
  const W = 320;
  const H = 150;
  const x = (i: number) => 36 + (i * (W - 60)) / (pts.length - 1);
  const y = (v: number) => 18 + ((hi - v) * (H - 50)) / (hi - lo);
  const id = `chart-${metric}`;
  return (
    <figure className="chart" aria-labelledby={`${id}-cap`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${def.label} 변화 그래프. 값은 아래 표에서도 확인할 수 있어요.`}>
        <line x1="30" x2={W - 10} y1={H - 30} y2={H - 30} stroke="#bfb19c" />
        <polyline fill="none" stroke="#526547" strokeWidth="3" points={pts.map((p, i) => `${x(i)},${y(p.values[metric])}`).join(' ')} />
        {pts.map((p, i) => (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.values[metric])} r="5" fill="#fffcf6" stroke="#526547" strokeWidth="3" />
            <text x={x(i)} y={y(p.values[metric]) - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="#302b25">
              {p.values[metric]}
            </text>
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#4a4239">
              {formatDateShort(seoulDate(new Date(p.measuredAt)))}
            </text>
          </g>
        ))}
      </svg>
      <figcaption id={`${id}-cap`} className="small">
        {def.label}({def.unit}) 변화 – 같은 값을 아래 표에서 확인할 수 있어요.
      </figcaption>
    </figure>
  );
}

export function BodyReport() {
  const state = useAppState();
  const member = findMember(state, state.demo.memberId)!;
  const list = memberMeasurements(state, member.id);
  return (
    <div className="stack-lg report">
      <PageNav back="/member/body" home="/member" />
      <PageHead title="자세한 결과 보기" desc={`${displayName(member)} · 회원번호 ${member.memberNo}`} />
      <div className="notice notice-warn" role="note">
        <span aria-hidden="true">!</span>
        <div>
          <strong>시연용 결과표예요</strong>
          인바디 공식 결과지가 아니며, 실제 측정 장비와 연결되어 있지 않은 가상 데이터예요.
        </div>
      </div>
      <div className="no-print">
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          인쇄하기
        </button>
      </div>
      {list.length === 0 ? (
        <Empty title="측정 기록이 없어요" />
      ) : (
        <>
          <div className="chart-row">
            <TrendChart list={list} metric="skeletalMuscle" />
            <TrendChart list={list} metric="bodyFatMass" />
          </div>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">측정 항목별 기록 (최신순)</caption>
              <thead>
                <tr>
                  <th scope="col">항목 (단위)</th>
                  {list.map((m) => (
                    <th key={m.id} scope="col" className="num">
                      {formatDate(seoulDate(new Date(m.measuredAt)))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((d) => (
                  <tr key={d.key}>
                    <th scope="row">
                      {d.label} ({d.unit})
                      {d.note && <div className="tiny muted" style={{ fontWeight: 500, whiteSpace: 'normal' }}>{d.note}</div>}
                    </th>
                    {list.map((m) => (
                      <td key={m.id} className="num">
                        {m.values[d.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="stack-sm">
            <h2>기록 정보</h2>
            <ul className="stack-sm" style={{ listStyle: 'none' }}>
              {list.map((m) => (
                <li key={m.id} className="panel-flat small">
                  <strong>{formatDateTime(m.measuredAt)}</strong> · 기록 ID {m.id} · 외부 결과 ID {m.externalId} · 출처: {m.source === 'demo' ? '시연' : '인바디'} ({m.device}) · {EXPL_LABEL[m.explanation.status]}
                </li>
              ))}
            </ul>
          </section>
          <p className="small muted">표준 범위는 표시하지 않아요. 이 앱은 내 이전 기록과의 비교와 지도자의 설명을 중심으로 보여드려요.</p>
        </>
      )}
    </div>
  );
}
