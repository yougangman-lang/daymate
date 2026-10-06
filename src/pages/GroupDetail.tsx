import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlockConfirm, type BlockTarget } from '../components/BlockConfirm';
import { CategoryArt } from '../components/CategoryArt';
import { Modal } from '../components/Modal';
import { ReportModal, type ReportTarget } from '../components/ReportModal';
import { TraitCompare, TraitLegend } from '../components/Traits';
import { Avatar, EmptyState, Icon, ScorePill, VerificationTag } from '../components/ui';
import { getCategory } from '../data/categories';
import {
  LIMITS,
  activeJoinRequest,
  cancelJoin,
  canHost,
  deleteCreatedGroup,
  isBlocked,
  removeBlock,
  requestJoin,
  toggleSave,
} from '../lib/actions';
import { TIME_SLOT_LABEL, formatDate, formatWon, timeSlotOf } from '../lib/date';
import { checkGroupForProfile, differences, fieldMatches, isGroupBlocked, proximity, remainingSeats } from '../lib/matching';
import { ME } from '../lib/types';
import { useStore } from '../store';

export function GroupDetail() {
  const { id = '' } = useParams();
  const { state, update, groups, personById, toast, today } = useStore();
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <div className="page narrow">
        <EmptyState title="그룹을 찾을 수 없어요" action={<Link to="/explore" className="btn btn-primary">둘러보기로</Link>}>
          <p>삭제됐거나 이 브라우저에 없는 그룹이에요.</p>
        </EmptyState>
      </div>
    );
  }

  const cat = getCategory(group.category);
  const host = personById(group.hostId);
  const traits = state.test.result;
  const score = traits ? proximity(traits, group.prefs) : null;
  const diffs = traits ? differences(traits, group.prefs) : [];
  const saved = state.savedGroupIds.includes(group.id);
  const left = remainingSeats(group);
  const mine = group.hostId === ME;
  const joined = group.memberIds.includes(ME);
  const request = activeJoinRequest(state, group.id);
  const blocked = isGroupBlocked(state.blocks, group);
  const myConds = state.profile.conditions[group.category];
  const eligibility = traits ? checkGroupForProfile(group, state.profile, state.blocks, today) : null;
  const variant = Number(group.id.replace(/\D/g, '').slice(-2)) || 0;

  if (blocked) {
    const groupBlocked = isBlocked(state, 'group', group.id);
    return (
      <div className="page narrow">
        <EmptyState
          title="차단한 그룹이에요"
          action={
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  update((s) => (groupBlocked ? removeBlock(s, 'group', group.id) : removeBlock(s, 'member', group.hostId)));
                  toast('차단을 해제했어요.');
                }}
              >
                {groupBlocked ? '그룹 차단 해제' : '호스트 차단 해제'}
              </button>
              <Link to="/records" className="btn btn-ghost">신고·차단 기록</Link>
            </div>
          }
        >
          <p>{groupBlocked ? '이 그룹을' : '이 그룹의 호스트를'} 차단해서 상세 내용을 숨겼어요.</p>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page detail">
      <button type="button" className="back-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/explore'))}>
        <Icon name="back" size={18} /> 뒤로
      </button>

      <div className="detail-hero">
        <CategoryArt category={group.category} variant={variant} label={`${cat.label} 활동 일러스트`} />
        <span className="gc-cat">{cat.label}</span>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <header className="detail-head">
            {score !== null && <ScorePill score={score} />}
            <h1>{group.title}</h1>
            <p className="detail-desc">{group.description}</p>
            <p className="notice small" role="note">
              {group.isSeed ? '예시 그룹(허구)이에요. ' : '내 브라우저에서 만든 그룹이에요. '}
              {cat.scheduleNote}
            </p>
          </header>

          <section className="detail-section host-card" aria-label="호스트">
            {host && <Avatar person={host} size={48} />}
            <div className="host-info">
              <p className="host-name">
                <span className="muted">호스트</span> <strong>{host?.nickname ?? '알 수 없음'}</strong>
              </p>
              {host && <VerificationTag person={host} />}
              {host && host.id !== ME && <p className="host-bio">{host.bio}</p>}
            </div>
            {host && host.id !== ME && (
              <div className="host-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReport({ type: 'member', id: host.id, label: host.nickname })}>
                  회원 신고
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlock({ type: 'member', id: host.id, label: host.nickname })}>
                  회원 차단
                </button>
              </div>
            )}
          </section>

          <section className="detail-section">
            <h2>일정과 장소</h2>
            <dl className="info-grid">
              <div>
                <dt>날짜</dt>
                <dd>{formatDate(group.date)}</dd>
              </div>
              <div>
                <dt>시간</dt>
                <dd>
                  {group.startTime} 시작 · {group.endTime} 종료 <span className="muted">({TIME_SLOT_LABEL[timeSlotOf(group.startTime)]})</span>
                </dd>
              </div>
              <div>
                <dt>활동 장소</dt>
                <dd>{group.place}</dd>
              </div>
              <div>
                <dt>첫 만남 장소</dt>
                <dd>
                  {group.meetingPoint} <span className="tag tag-ok">공개 장소</span>
                </dd>
              </div>
              <div>
                <dt>해산 계획</dt>
                <dd>{group.dismissPlan}</dd>
              </div>
              <div>
                <dt>모집 인원</dt>
                <dd>
                  호스트 포함 {group.capacity}명 중 <strong>{group.memberIds.length}명</strong> 참여 · {left === 0 ? '모집 마감' : `${left}자리 남음`}
                </dd>
              </div>
            </dl>
            <ul className="member-list" aria-label="참여 멤버">
              {group.memberIds.map((mid) => {
                const p = personById(mid);
                if (!p) return null;
                return (
                  <li key={mid}>
                    <Avatar person={p} size={32} />
                    <span>
                      {p.nickname}
                      {mid === group.hostId && <span className="muted"> · 호스트</span>}
                      {mid === ME && <span className="muted"> · 나</span>}
                    </span>
                    {mid !== ME && mid !== group.hostId && (
                      <span className="member-actions">
                        <button type="button" className="linklike" onClick={() => setReport({ type: 'member', id: p.id, label: p.nickname })}>
                          신고
                        </button>
                        <button type="button" className="linklike" onClick={() => setBlock({ type: 'member', id: p.id, label: p.nickname })}>
                          차단
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="detail-section">
            <h2>비용</h2>
            <p className="cost-big">
              1인 예상 <strong>{group.cost.total === 0 ? '비용 없음' : formatWon(group.cost.total)}</strong>
            </p>
            <div className="grid-2">
              <div>
                <h3 className="mini-title">포함</h3>
                <ul className="bullets">{group.cost.included.length ? group.cost.included.map((x) => <li key={x}>{x}</li>) : <li className="muted">없음</li>}</ul>
              </div>
              <div>
                <h3 className="mini-title">별도</h3>
                <ul className="bullets">{group.cost.separate.length ? group.cost.separate.map((x) => <li key={x}>{x}</li>) : <li className="muted">없음</li>}</ul>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h2>간단한 동선</h2>
            <ol className="timeline">
              {group.route.map((r, i) => (
                <li key={i}>
                  <span className="tl-time">{r.time || '·'}</span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ol>
            <h3 className="mini-title">추가 활동</h3>
            {group.extras.length === 0 ? (
              <p className="muted">추가 활동 없음</p>
            ) : (
              <ul className="extra-list">
                {group.extras.map((x) => (
                  <li key={x.label}>
                    {x.label} <span className={`tag ${x.required ? 'tag-warn' : 'tag-ok'}`}>{x.required ? '필수' : '선택'}</span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mini-title">취소 기준</h3>
            <p>{group.cancelPolicy}</p>
          </section>

          <section className="detail-section">
            <div className="section-head">
              <h2>동행 선호 5개 축</h2>
              {traits && <TraitLegend />}
            </div>
            <TraitCompare user={traits} group={group.prefs} />
            {traits ? (
              diffs.length > 0 ? (
                <div className="diff-box">
                  <h3 className="mini-title">나와 다른 부분</h3>
                  <ul className="bullets">
                    {diffs.map((d) => (
                      <li key={d.name}>
                        <strong>{d.name}</strong>: 나는 “{d.userLabel}”, 그룹은 “{d.groupLabel}”
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted">크게 다른 축이 없어요.</p>
              )
            ) : (
              <p className="muted">
                <Link to="/start">취향 확인</Link>을 마치면 나와 비교해 볼 수 있어요.
              </p>
            )}
          </section>

          <section className="detail-section">
            <h2>{cat.label} 조건</h2>
            <table className="cond-table">
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">그룹</th>
                  <th scope="col">나</th>
                </tr>
              </thead>
              <tbody>
                {cat.fields.map((f) => {
                  const gv = group.conditions[f.key];
                  const mv = myConds?.[f.key];
                  const okMatch = fieldMatches(f, gv, mv);
                  const fmt = (v: typeof gv | undefined) => (v === undefined ? '—' : Array.isArray(v) ? v.join(', ') : v);
                  return (
                    <tr key={f.key}>
                      <th scope="row">
                        {f.label}
                        {f.match === 'required' && <span className="req-tag req">맞아야 추천</span>}
                      </th>
                      <td>{fmt(gv)}</td>
                      <td>
                        {fmt(mv)}
                        {f.match === 'required' && mv !== undefined && (
                          <span className={`match ${okMatch ? 'ok' : 'no'}`}>{okMatch ? ' 맞음' : ' 다름'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {eligibility && !eligibility.eligible && !mine && (
              <p className="notice small">내 조건과 맞지 않는 부분이 있어 추천 목록에는 표시되지 않는 그룹이에요. 그래도 참여 요청은 할 수 있어요.</p>
            )}
          </section>

          <section className="detail-section safety-mini">
            <h2>만남 전 확인해 주세요</h2>
            <ul className="bullets">
              <li>첫 만남은 공개된 장소({group.meetingPoint})에서 해요.</li>
              <li>추가 구매·뒤풀이·사진 촬영은 본인이 선택해요. 원치 않으면 거절해도 괜찮아요.</li>
              <li>불편한 일이 생기면 신고·차단을 이용하고, 긴급 상황은 112에 신고하세요.</li>
            </ul>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReport({ type: 'group', id: group.id, label: group.title })}>
              <Icon name="flag" size={16} /> 그룹 신고
            </button>
            {!mine && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlock({ type: 'group', id: group.id, label: group.title })}>
                <Icon name="ban" size={16} /> 그룹 차단
              </button>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <div className="action-card" id="action-card" tabIndex={-1} role="region" aria-label="참여 신청">
            <p className="ac-price">{group.cost.total === 0 ? '비용 없음' : `1인 약 ${formatWon(group.cost.total)}`}</p>
            <p className="ac-sub">
              {formatDate(group.date)} {group.startTime}–{group.endTime}
            </p>
            <p className={`ac-seats ${left === 0 ? 'full' : ''}`}>{left === 0 ? '모집 마감' : `${left}자리 남음 · ${group.memberIds.length}/${group.capacity}명`}</p>
            <div className="ac-buttons">
              {mine ? (
                <>
                  <Link to={`/host?group=${group.id}`} className="btn btn-primary btn-block">
                    역매칭으로 초대하기
                  </Link>
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setDeleteOpen(true)}>
                    그룹 삭제
                  </button>
                </>
              ) : joined ? (
                <p className="tag tag-ok big">참여 확정된 그룹이에요</p>
              ) : request ? (
                <>
                  <p className="tag tag-muted big">참여 요청 기록됨 · 호스트에게 전송되지 않음(시제품)</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => {
                      update((s) => cancelJoin(s, group.id));
                      toast('참여 요청을 취소했어요.');
                    }}
                  >
                    참여 요청 취소
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary btn-block btn-lg" disabled={left === 0} onClick={() => setJoinOpen(true)}>
                  {left === 0 ? '모집 마감' : '참여 요청'}
                </button>
              )}
              <button
                type="button"
                className={`btn btn-outline btn-block ${saved ? 'is-on' : ''}`}
                aria-pressed={saved}
                onClick={() => {
                  update((s) => toggleSave(s, group.id));
                  toast(saved ? '저장을 취소했어요.' : '저장했어요.');
                }}
              >
                <Icon name={saved ? 'heart-fill' : 'heart'} size={18} /> {saved ? '저장됨' : '저장'}
              </button>
              {canHost(group) && !mine && (
                <Link to={`/host?group=${group.id}`} className="btn btn-ghost btn-block btn-sm">
                  시연: 이 그룹의 호스트로 역매칭 체험
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mobile-cta">
        <div className="mc-info">
          <strong>{group.cost.total === 0 ? '비용 없음' : `1인 약 ${formatWon(group.cost.total)}`}</strong>
          <span>{left === 0 ? '모집 마감' : `${left}자리 남음 · ${group.memberIds.length}/${group.capacity}명`}</span>
        </div>
        {!mine && !joined && !request && left > 0 ? (
          <button type="button" className="btn btn-primary" onClick={() => setJoinOpen(true)}>
            참여 요청
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => {
              const el = document.getElementById('action-card');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el?.focus({ preventScroll: true });
            }}
          >
            {mine ? '그룹 관리' : joined ? '참여 확정' : request ? '요청 상태' : '모집 마감'}
          </button>
        )}
      </div>

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} groupId={group.id} />
      <ReportModal target={report} onClose={() => setReport(null)} />
      <BlockConfirm target={block} onClose={() => setBlock(null)} />
      <Modal
        open={deleteOpen}
        title="그룹 삭제"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                update((s) => deleteCreatedGroup(s, group.id));
                toast('그룹을 삭제했어요. 대기 중인 초대는 취소됐어요.');
                navigate('/me');
              }}
            >
              삭제
            </button>
          </>
        }
      >
        <p>이 그룹을 삭제하면 둘러보기와 역매칭에서 사라지고 대기 중인 초대는 취소돼요.</p>
      </Modal>
    </div>
  );
}

function JoinModal({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const { state, update, groups, toast } = useStore();
  const [message, setMessage] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const msgId = useId();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const close = () => {
    setError('');
    onClose();
  };

  const submit = () => {
    if (!agree) {
      setError('안내 사항을 확인하고 체크해 주세요.');
      return;
    }
    const r = requestJoin(state, group, message);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    update(() => r.state);
    toast('참여 요청을 기록했어요. 시제품이라 호스트에게 전송되지는 않아요.');
    setMessage('');
    setAgree(false);
    close();
  };

  return (
    <Modal
      open={open}
      title="참여 요청"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            참여 요청 남기기
          </button>
        </>
      }
    >
      <p className="modal-target">{group.title}</p>
      <ul className="summary-list">
        <li>
          <span>일시</span>
          {formatDate(group.date)} {group.startTime}–{group.endTime}
        </li>
        <li>
          <span>첫 만남</span>
          {group.meetingPoint}
        </li>
        <li>
          <span>예상 비용</span>
          {formatWon(group.cost.total)} (별도: {group.cost.separate.join(', ') || '없음'})
        </li>
        <li>
          <span>해산</span>
          {group.dismissPlan}
        </li>
        {group.extras.length > 0 && (
          <li>
            <span>추가 활동</span>
            {group.extras.map((x) => `${x.label}(${x.required ? '필수' : '선택'})`).join(', ')}
          </li>
        )}
      </ul>
      <div className="field">
        <label htmlFor={msgId}>호스트에게 한마디 (선택)</label>
        <textarea
          id={msgId}
          rows={3}
          maxLength={LIMITS.joinMessage}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="연락처·학번 등 개인정보는 적지 마세요."
        />
      </div>
      <label className="check-row">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>첫 만남은 공개 장소에서 하고, 추가 구매·뒤풀이·사진 촬영은 본인 선택이라는 점을 확인했어요.</span>
      </label>
      <p className="fine-print">시제품에서는 요청이 이 브라우저에만 기록되고 호스트에게 전송되지 않아요.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
