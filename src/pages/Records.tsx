import { Link } from 'react-router-dom';
import { DemoNote, EmptyState, PageHeader } from '../components/ui';
import { removeBlock } from '../lib/actions';
import { useStore } from '../store';

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function Records() {
  const { state, update, toast } = useStore();
  return (
    <div className="page narrow">
      <PageHeader eyebrow="안전" title="신고·차단 기록" />
      <DemoNote>
        시제품에서는 신고가 운영자에게 전달되지 않아 ‘접수 완료’ 상태가 없어요. 실제 서비스에서는 운영팀 검토 후 처리 상태가 갱신돼야
        해요.
      </DemoNote>

      <section className="section" aria-labelledby="rep-title">
        <h2 id="rep-title" className="section-title">신고 기록 {state.reports.length}건</h2>
        {state.reports.length === 0 ? (
          <p className="muted">신고 기록이 없어요. 그룹 상세나 역매칭 후보에서 신고할 수 있어요.</p>
        ) : (
          <ul className="inv-list">
            {state.reports.map((r) => (
              <li key={r.id} className="inv-row">
                <div className="inv-main">
                  <strong>
                    {r.targetType === 'group' ? '그룹' : '회원'} · {r.targetLabel}
                  </strong>
                  <span className="status status-local">처리 상태: 미전송 (이 브라우저에만 기록)</span>
                  <p>사유: {r.reason}</p>
                  {r.detail && <p className="inv-msg">{r.detail}</p>}
                  <p className="muted small">{fmt(r.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="blk-title">
        <h2 id="blk-title" className="section-title">차단 목록 {state.blocks.length}건</h2>
        {state.blocks.length === 0 ? (
          <EmptyState title="차단한 대상이 없어요">
            <p>차단하면 해당 그룹이나 회원이 추천·둘러보기·역매칭에서 즉시 빠져요.</p>
          </EmptyState>
        ) : (
          <ul className="inv-list">
            {state.blocks.map((b) => (
              <li key={`${b.targetType}-${b.targetId}`} className="inv-row">
                <div className="inv-main">
                  <strong>
                    {b.targetType === 'group' ? '그룹' : '회원'} · {b.targetLabel}
                  </strong>
                  <span className="muted small">{fmt(b.createdAt)} 차단</span>
                </div>
                <div className="inv-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      update((s) => removeBlock(s, b.targetType, b.targetId));
                      toast(`${b.targetLabel} 차단을 해제했어요.`);
                    }}
                  >
                    차단 해제
                  </button>
                  {b.targetType === 'group' && (
                    <Link to={`/groups/${b.targetId}`} className="btn btn-ghost btn-sm">
                      그룹 보기
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
