import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BlockConfirm, type BlockTarget } from '../components/BlockConfirm';
import { Modal } from '../components/Modal';
import { ModeSwitch } from '../components/ModeSwitch';
import { ReportModal, type ReportTarget } from '../components/ReportModal';
import { Avatar, DemoNote, EmptyState, PageHeader, ScorePill, VerificationTag } from '../components/ui';
import { AXES } from '../data/axes';
import { CATEGORY_MAP, getCategory } from '../data/categories';
import { LIMITS, canHost, cancelInvite, sendInvite } from '../lib/actions';
import { TIME_SLOT_LABEL, formatDate, formatWon, timeSlotOf } from '../lib/date';
import { findCandidates, remainingSeats } from '../lib/matching';
import type { Group, Invitation, Person } from '../lib/types';
import { ME } from '../lib/types';
import { useStore } from '../store';

export const INVITE_STATUS: Record<Invitation['status'], string> = {
  pending: '응답 대기',
  accepted: '수락함 · 참여 확정',
  declined: '거절함',
  cancelled: '초대 취소됨',
};

export function Host() {
  const { state, update, groups, everyone, personById, toast, today } = useStore();
  const [params, setParams] = useSearchParams();
  const [inviteTo, setInviteTo] = useState<Person | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [block, setBlock] = useState<BlockTarget | null>(null);
  const selectId = useId();

  const hostable = groups.filter((g) => canHost(g) && g.date >= today).sort((a, b) => Number(b.hostId === ME) - Number(a.hostId === ME));
  const selectedId = params.get('group');
  const group = hostable.find((g) => g.id === selectedId) ?? hostable[0];
  const actingHost = group ? group.hostId : ME;

  const { candidates } = group ? findCandidates(group, everyone, state, actingHost) : { candidates: [] };
  const sent = group ? state.invitations.filter((i) => i.groupId === group.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const full = group ? remainingSeats(group) <= 0 : false;

  return (
    <div className="page">
      <ModeSwitch />
      <PageHeader
        eyebrow="호스트 역매칭"
        title="우리 그룹에 맞는 참여자 찾기"
        desc="그룹의 활동·날짜·시간·예산·필수 조건이 맞고, 역매칭 공개에 동의한 참여자만 성향 근접도 순으로 보여줘요."
      />
      <DemoNote>
        예시 참여자는 허구예요. 초대는 실제로 전송되지 않고, ‘참여자 화면’으로 전환해 수락·거절을 시연할 수 있어요.
      </DemoNote>

      {hostable.length === 0 || !group ? (
        <EmptyState title="호스트로 관리할 그룹이 없어요" action={<Link to="/create" className="btn btn-primary">새 그룹 만들기</Link>}>
          <p>그룹을 만들면 여기서 역매칭 후보를 찾을 수 있어요.</p>
        </EmptyState>
      ) : (
        <>
          <section className="form-card">
            <div className="field">
              <label htmlFor={selectId} className="form-title">
                내 그룹 선택
              </label>
              <select id={selectId} value={group.id} onChange={(e) => setParams({ group: e.target.value }, { replace: true })}>
                {hostable.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.hostId === ME ? '[내 그룹] ' : '[시연용 예시] '}
                    {g.title}
                  </option>
                ))}
              </select>
              {group.hostId !== ME && (
                <p className="field-hint">
                  시연용 예시 그룹이에요. 예시 호스트 ‘{personById(group.hostId)?.nickname}’의 역할을 대신 체험해요.
                </p>
              )}
            </div>
            <GroupSummary group={group} />
          </section>

          <section className="section" aria-labelledby="cand-title">
            <div className="section-head">
              <h2 id="cand-title" className="section-title">추천 후보 {candidates.length}명</h2>
              <Link to={`/groups/${group.id}`} className="more-link">그룹 상세</Link>
            </div>
            <p className="section-sub">공개에 동의하지 않았거나, 차단했거나, 이미 초대·참여한 사람은 목록에 나타나지 않아요.</p>
            {full && (
              <p className="notice notice-warn" role="note">
                정원이 모두 찼어요. 더 초대할 수 없어요.
              </p>
            )}
            {candidates.length === 0 ? (
              <EmptyState title="조건에 맞는 후보가 없어요">
                <p>날짜·예산·필수 조건을 넓히면 후보가 늘어날 수 있어요. 예시 데이터라 후보 수가 적어요.</p>
              </EmptyState>
            ) : (
              <ul className="cand-list">
                {candidates.map(({ person, score }) => (
                  <li key={person.id} className="cand-card">
                    <div className="cand-top">
                      <Avatar person={person} size={48} />
                      <div className="cand-id">
                        <strong>{person.nickname}</strong>
                        <span className="muted">
                          {person.ageRange} · {person.id === ME ? '내 프로필' : '예시 참여자(허구)'}
                        </span>
                        <VerificationTag person={person} />
                      </div>
                      <ScorePill score={score} />
                    </div>
                    {person.id !== ME && <p className="cand-bio">{person.bio}</p>}
                    <ul className="cand-axes" aria-label="성향 비교">
                      {AXES.map((a, i) => (
                        <li key={a.key} className={person.traits[i] === group.prefs[i] ? 'same' : Math.abs(person.traits[i] - group.prefs[i]) >= 50 ? 'far' : ''}>
                          <span>{a.name}</span>
                          <strong>{a.options.find((o) => o.value === person.traits[i])!.label}</strong>
                        </li>
                      ))}
                    </ul>
                    <p className="cand-cond">
                      관심 {person.interests.map((c) => CATEGORY_MAP[c].short).join('·')} · 예산 상한 {formatWon(person.budgetMax)} · 조건 일치
                    </p>
                    <div className="row-actions">
                      <button type="button" className="btn btn-primary" disabled={full} onClick={() => setInviteTo(person)}>
                        초대하기
                      </button>
                      {person.id !== ME && (
                        <>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReport({ type: 'member', id: person.id, label: person.nickname })}>
                            신고
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBlock({ type: 'member', id: person.id, label: person.nickname })}>
                            차단
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="section" aria-labelledby="sent-title">
            <h2 id="sent-title" className="section-title">보낸 초대 {sent.length}건</h2>
            {sent.length === 0 ? (
              <p className="muted">아직 보낸 초대가 없어요.</p>
            ) : (
              <ul className="inv-list">
                {sent.map((inv) => {
                  const p = personById(inv.participantId);
                  return (
                    <li key={inv.id} className="inv-row">
                      {p && <Avatar person={p} size={36} />}
                      <div className="inv-main">
                        <strong>{p?.nickname ?? '알 수 없음'}</strong>
                        <span className={`status status-${inv.status}`}>{INVITE_STATUS[inv.status]}</span>
                        <p className="inv-msg">“{inv.message}”</p>
                      </div>
                      <div className="inv-actions">
                        {inv.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                const r = cancelInvite(state, inv.id);
                                if (r.ok) {
                                  update(() => r.state);
                                  toast('초대를 취소했어요.');
                                } else toast(r.error, 'error');
                              }}
                            >
                              초대 취소
                            </button>
                            <Link to={`/invites?as=${inv.participantId}`} className="btn btn-outline btn-sm">
                              참여자 화면에서 보기
                            </Link>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {group && inviteTo && <InviteModal group={group} person={inviteTo} onClose={() => setInviteTo(null)} />}
      <ReportModal target={report} onClose={() => setReport(null)} />
      <BlockConfirm target={block} onClose={() => setBlock(null)} />
    </div>
  );
}

export function GroupSummary({ group }: { group: Group }) {
  const cat = getCategory(group.category);
  const left = remainingSeats(group);
  return (
    <dl className="summary-grid">
      <div>
        <dt>활동</dt>
        <dd>{cat.label}</dd>
      </div>
      <div>
        <dt>일시</dt>
        <dd>
          {formatDate(group.date)} {group.startTime}–{group.endTime} ({TIME_SLOT_LABEL[timeSlotOf(group.startTime)]})
        </dd>
      </div>
      <div>
        <dt>예상 비용</dt>
        <dd>{formatWon(group.cost.total)}</dd>
      </div>
      <div>
        <dt>모집</dt>
        <dd>
          {group.memberIds.length}/{group.capacity}명 · {left === 0 ? '마감' : `${left}자리 남음`}
        </dd>
      </div>
      <div>
        <dt>첫 만남</dt>
        <dd>{group.meetingPoint}</dd>
      </div>
      <div>
        <dt>조건</dt>
        <dd>
          {cat.fields
            .filter((f) => f.match === 'required' && group.conditions[f.key] !== undefined)
            .map((f) => {
              const v = group.conditions[f.key];
              return `${f.label}: ${Array.isArray(v) ? v.join(', ') : v}`;
            })
            .join(' · ')}
        </dd>
      </div>
    </dl>
  );
}

function InviteModal({ group, person, onClose }: { group: Group; person: Person; onClose: () => void }) {
  const { state, update, groups, everyone, toast } = useStore();
  const [message, setMessage] = useState(`안녕하세요! ${formatDate(group.date)} ‘${group.title}’ 함께하실래요? 조건이 잘 맞아서 초대드려요.`);
  const [error, setError] = useState('');
  const msgId = useId();

  const send = () => {
    const r = sendInvite(state, groups, everyone, { groupId: group.id, participantId: person.id, message });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    update(() => r.state);
    toast(`${person.nickname}님에게 초대를 남겼어요. (시제품: 실제 전송 없음)`);
    onClose();
  };

  return (
    <Modal
      open
      title={`${person.nickname}님 초대`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn-primary" onClick={send}>
            초대 보내기
          </button>
        </>
      }
    >
      <p className="field-hint">참여자는 아래 활동 정보와 메시지를 확인하고 수락 또는 거절할 수 있어요. 수락해야 참여가 확정돼요.</p>
      <GroupSummary group={group} />
      <div className="field">
        <label htmlFor={msgId}>초대 메시지</label>
        <textarea id={msgId} rows={4} maxLength={LIMITS.inviteMessage} value={message} onChange={(e) => setMessage(e.target.value)} />
        <p className="field-hint">
          {message.length}/{LIMITS.inviteMessage} · 연락처·학번 등 개인정보는 적지 마세요.
        </p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
