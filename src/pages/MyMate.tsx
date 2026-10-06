import { useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GroupCard } from '../components/GroupCard';
import { OptInCard } from '../components/OptInCard';
import { EmptyState, PageHeader } from '../components/ui';
import { cancelJoin } from '../lib/actions';
import { formatDate } from '../lib/date';
import { ME } from '../lib/types';
import { useStore } from '../store';
import { INVITE_STATUS } from './Host';

const TABS = [
  { id: 'requests', label: '참여 요청' },
  { id: 'saved', label: '저장' },
  { id: 'invites', label: '초대' },
  { id: 'mine', label: '내 그룹·참여' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function MyMate() {
  const { state, update, groups, personById, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as TabId | null;
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === tabParam) ? tabParam! : 'requests');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: TabId) => {
    setTab(id);
    setParams({ tab: id }, { replace: true });
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      select(TABS[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  const requests = state.joinRequests.filter((r) => r.status === 'pending');
  const saved = groups.filter((g) => state.savedGroupIds.includes(g.id));
  const received = state.invitations.filter((i) => i.participantId === ME);
  const sent = state.invitations.filter((i) => groups.find((g) => g.id === i.groupId)?.hostId === ME);
  const created = groups.filter((g) => g.hostId === ME);
  const joined = groups.filter((g) => g.memberIds.includes(ME) && g.hostId !== ME);
  const counts: Record<TabId, number> = {
    requests: requests.length,
    saved: saved.length,
    invites: received.filter((i) => i.status === 'pending').length,
    mine: created.length + joined.length,
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="내 동행"
        title={state.profile.nickname ? `${state.profile.nickname}님의 동행` : '내 동행'}
        action={<Link to="/create" className="btn btn-dark btn-sm">+ 새 그룹</Link>}
      />

      <div className="tabs" role="tablist" aria-label="내 동행 분류">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="tab-btn"
            onClick={() => select(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="count">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel">
        {tab === 'requests' &&
          (requests.length === 0 ? (
            <EmptyState title="보낸 참여 요청이 없어요" action={<Link to="/result" className="btn btn-primary">추천 그룹 보기</Link>} />
          ) : (
            <ul className="inv-list">
              {requests.map((r) => {
                const g = groups.find((x) => x.id === r.groupId);
                return (
                  <li key={r.groupId} className="inv-row">
                    <div className="inv-main">
                      {g ? <Link to={`/groups/${g.id}`}><strong>{g.title}</strong></Link> : <strong>삭제된 그룹</strong>}
                      <span className="status status-pending">요청 기록됨 · 호스트에게 전송되지 않음(시제품)</span>
                      {g && <p className="muted">{formatDate(g.date)} {g.startTime}</p>}
                      {r.message && <p className="inv-msg">“{r.message}”</p>}
                    </div>
                    <div className="inv-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          update((s) => cancelJoin(s, r.groupId));
                          toast('참여 요청을 취소했어요.');
                        }}
                      >
                        요청 취소
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ))}

        {tab === 'saved' &&
          (saved.length === 0 ? (
            <EmptyState title="저장한 그룹이 없어요" action={<Link to="/explore" className="btn btn-primary">둘러보기</Link>}>
              <p>카드의 하트 버튼으로 저장할 수 있어요.</p>
            </EmptyState>
          ) : (
            <div className="card-grid">
              {saved.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          ))}

        {tab === 'invites' && (
          <>
            <h2 className="section-title sm">받은 초대</h2>
            {received.length === 0 ? (
              <p className="muted">
                받은 초대가 없어요. <Link to="/invites">받은 초대 화면</Link>에서 예시 참여자 시점으로도 확인할 수 있어요.
              </p>
            ) : (
              <ul className="inv-list">
                {received.map((inv) => {
                  const g = groups.find((x) => x.id === inv.groupId);
                  return (
                    <li key={inv.id} className="inv-row">
                      <div className="inv-main">
                        <strong>{g?.title ?? '삭제된 그룹'}</strong>
                        <span className={`status status-${inv.status}`}>{INVITE_STATUS[inv.status]}</span>
                      </div>
                      <Link to="/invites" className="btn btn-outline btn-sm">확인</Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <h2 className="section-title sm">내 그룹에서 보낸 초대</h2>
            {sent.length === 0 ? (
              <p className="muted">
                <Link to="/host">호스트 화면</Link>에서 초대를 보낼 수 있어요.
              </p>
            ) : (
              <ul className="inv-list">
                {sent.map((inv) => (
                  <li key={inv.id} className="inv-row">
                    <div className="inv-main">
                      <strong>{personById(inv.participantId)?.nickname}</strong>
                      <span className="muted"> · {groups.find((g) => g.id === inv.groupId)?.title}</span>
                      <span className={`status status-${inv.status}`}>{INVITE_STATUS[inv.status]}</span>
                    </div>
                    <Link to={`/host?group=${inv.groupId}`} className="btn btn-outline btn-sm">관리</Link>
                  </li>
                ))}
              </ul>
            )}
            <OptInCard />
          </>
        )}

        {tab === 'mine' && (
          <>
            <h2 className="section-title sm">내가 만든 그룹</h2>
            {created.length === 0 ? (
              <p className="muted">
                아직 만든 그룹이 없어요. <Link to="/create">새 그룹 만들기</Link>
              </p>
            ) : (
              <div className="card-grid">
                {created.map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
            <h2 className="section-title sm">참여 확정</h2>
            {joined.length === 0 ? (
              <p className="muted">초대를 수락하면 여기에 표시돼요.</p>
            ) : (
              <div className="card-grid">
                {joined.map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
