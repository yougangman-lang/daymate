import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useNow } from '../../store/store';
import type { InquiryCategory, Member, NotificationPrefs } from '../../domain/types';
import { displayName, findMember, staffName, upcomingBookings, waitingList } from '../../domain/selectors';
import { getSession, PLAN_INFO, sessionEnd } from '../../domain/schedule';
import { formatDate, formatDateTime, seoulDate } from '../../lib/time';
import { cancelBooking, cancelWait, confirmOffer } from '../../services/booking';
import { createInquiry, INQUIRY_LABEL, updatePrefs } from '../../services/member';
import { ConditionForm, ConditionSummary } from '../../components/ConditionForm';
import { ConfirmDialog, Empty, Notice, PageHead, PageNav, useRunner } from '../../components/ui';
import { speechSupported } from '../../components/Speak';
import { MembershipLine } from './shared';

const BOOKING_STATUS = { booked: '예약됨', cancelled: '취소함', attended: '출석', absent: '결석' } as const;

export function MePage() {
  const state = useAppState();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const { run, msg } = useRunner();
  const upcoming = upcomingBookings(state, member.id, now);
  const waits = state.waitlist.filter((w) => w.memberId === member.id && (w.status === 'waiting' || w.status === 'offered'));
  const history = state.bookings
    .filter((b) => b.memberId === member.id && !upcoming.some((u) => u.booking.id === b.id))
    .map((b) => ({ b, s: getSession(b.sessionId)! }))
    .sort((a, b) => (a.s.id < b.s.id ? 1 : -1))
    .slice(0, 8);
  const coupons = state.coupons.filter((c) => c.memberId === member.id);
  const inquiries = state.inquiries.filter((q) => q.memberId === member.id);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [condFor, setCondFor] = useState<string | null>(null);
  const cancelTarget = upcoming.find((u) => u.booking.id === cancelId);

  return (
    <div className="stack-lg">
      <PageHead title="내 정보" />
      <section className="panel stack" aria-labelledby="profile-h">
        <h2 id="profile-h">프로필</h2>
        <dl className="kv">
          <dt>이름</dt>
          <dd>{displayName(member)}</dd>
          <dt>나이대</dt>
          <dd>{member.ageGroup}</dd>
          <dt>회원번호</dt>
          <dd>{member.memberNo}</dd>
          <dt>가입일</dt>
          <dd>{formatDate(member.joinedAt)}</dd>
        </dl>
        <p className="small muted">가상 회원 프로필이에요. 온유는 주민번호·주소처럼 수업에 필요 없는 개인정보를 받지 않아요.</p>
      </section>

      <section className="panel stack" aria-labelledby="ms-h">
        <h2 id="ms-h">이용 상태와 회원권</h2>
        <MembershipLine state={state} member={member} now={now} />
        {member.memberships.length > 0 && (
          <ul className="plain-list small">
            {[...member.memberships].reverse().map((m) => (
              <li key={m.id}>
                {PLAN_INFO[m.plan].label} · {formatDate(m.startDate)} ~ {formatDate(m.endDate)} {m.status === 'paused' && '(휴회)'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="bookings" className="stack" aria-labelledby="bk-h">
        <h2 id="bk-h">예약·대기 내역</h2>
        <Notice msg={msg} />
        {upcoming.length === 0 && waits.length === 0 && (
          <Empty title="예정된 예약이 없어요">
            <Link to="/member/book">수업 예약하러 가기</Link>
          </Empty>
        )}
        <ul className="stack" style={{ listStyle: 'none' }}>
          {upcoming.map(({ booking: b, session: s }) => (
            <li key={b.id} className="panel stack-sm">
              <div className="row between">
                <strong>
                  {formatDate(s.date)} {s.slot}
                </strong>
                <span className="tag tag-ok">예약됨{b.kind === 'trial' ? ' · 체험' : ''}</span>
              </div>
              <span>{s.program.title}</span>
              <span className="small">
                컨디션: <ConditionSummary booking={b} />
              </span>
              {condFor === b.id ? (
                <div className="panel-soft">
                  <ConditionForm booking={b} memberId={member.id} onDone={() => setCondFor(null)} />
                </div>
              ) : (
                <div className="btn-row">
                  <button type="button" className="btn btn-secondary" onClick={() => setCondFor(b.id)}>
                    컨디션 알려주기
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => setCancelId(b.id)}>
                    예약 취소
                  </button>
                </div>
              )}
            </li>
          ))}
          {waits.map((w) => {
            const s = getSession(w.sessionId)!;
            const pos = waitingList(state, w.sessionId).findIndex((x) => x.id === w.id) + 1;
            return (
              <li key={w.id} className="panel stack-sm">
                <div className="row between">
                  <strong>
                    {formatDate(s.date)} {s.slot}
                  </strong>
                  <span className="tag tag-warn">{w.status === 'offered' ? '자리 생김 · 확정 필요' : `대기 ${pos}번째`}</span>
                </div>
                <span>{s.program.title}</span>
                <div className="btn-row">
                  {w.status === 'offered' && (
                    <button type="button" className="btn btn-primary" onClick={() => run((st, n) => confirmOffer(st, member.id, w.id, n))}>
                      예약 확정하기
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => run((st, n) => cancelWait(st, member.id, w.id, n))}>
                    대기 취소
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {history.length > 0 && (
          <details className="fold">
            <summary>지난 예약 기록 {history.length}건</summary>
            <ul className="fold-body plain-list small">
              {history.map(({ b, s }) => (
                <li key={b.id}>
                  {formatDate(s.date)} {s.slot} {s.program.title} · {sessionEnd(s) <= now && b.status === 'booked' ? '출석 확인 중' : BOOKING_STATUS[b.status]}
                  {b.kind === 'trial' && ' (체험)'}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section id="coupons" className="panel stack" aria-labelledby="cp-h">
        <h2 id="cp-h">발급한 할인코드</h2>
        {coupons.length === 0 ? (
          <p className="small muted">아직 받은 코드가 없어요.</p>
        ) : (
          <ul className="plain-list">
            {coupons.map((c) => {
              const p = state.products.find((x) => x.id === c.productId);
              const expired = c.expiresOn < seoulDate(now);
              return (
                <li key={c.id} className="coupon-line">
                  <span>
                    <strong>{p?.name}</strong>
                    <span className="code small"> {c.code}</span>
                  </span>
                  <span className="small">
                    {c.demoUsedAt ? '시연 사용 처리됨' : expired ? '기간 만료' : `${formatDate(c.expiresOn)}까지`}
                  </span>
                  <Link className="small" to={`/member/mall/${c.productId}`}>
                    보기
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Settings member={member} />

      <section id="inquiries" className="panel stack" aria-labelledby="iq-h">
        <div className="section-title">
          <h2 id="iq-h">문의</h2>
          <Link className="btn btn-secondary btn-sm" to="/member/me/help">
            도움 요청하기
          </Link>
        </div>
        <InquiryList memberId={member.id} />
        {inquiries.length === 0 && <p className="small muted">보낸 문의가 없어요.</p>}
      </section>

      <ConfirmDialog
        open={!!cancelTarget}
        title="예약을 취소할까요?"
        body={cancelTarget && `${formatDate(cancelTarget.session.date)} ${cancelTarget.session.slot} ${cancelTarget.session.program.title} 수업 예약을 취소해요. 대기하는 분이 있으면 자리가 났다고 알려드려요.`}
        confirmLabel="네, 취소할게요"
        danger
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          if (cancelId) run((s, n) => cancelBooking(s, member.id, cancelId, n));
          setCancelId(null);
        }}
      />
    </div>
  );
}

function InquiryList({ memberId }: { memberId: string }) {
  const state = useAppState();
  const inquiries = state.inquiries.filter((q) => q.memberId === memberId);
  return (
    <ul className="stack" style={{ listStyle: 'none' }}>
      {inquiries.map((q) => (
        <li key={q.id} className="panel-soft stack-sm">
          <div className="row between">
            <strong>{INQUIRY_LABEL[q.category]}</strong>
            <span className={`tag ${q.status === 'answered' ? 'tag-ok' : 'tag-warn'}`}>{q.status === 'answered' ? '답변 완료' : '답변 대기'}</span>
          </div>
          <p>{q.message}</p>
          <span className="tiny muted">{formatDateTime(q.createdAt)}</span>
          {q.answer && (
            <div className="answer">
              <span className="small strong">온유 담당자 {staffName(state, q.answeredBy)} 답변</span>
              <p>{q.answer}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const NOTI_LABEL: Record<keyof NotificationPrefs, string> = {
  feedback: '코치 피드백',
  explanation: '측정 결과·설명',
  waitlist: '대기 수업 자리 알림',
  inquiry: '문의 답변',
};

function Settings({ member }: { member: Member }) {
  const { run, msg } = useRunner();
  const p = member.prefs;
  return (
    <section id="settings" className="panel stack" aria-labelledby="set-h">
      <h2 id="set-h">보기·듣기·알림 설정</h2>
      <fieldset className="stack-sm">
        <legend className="strong">글씨 크기</legend>
        <div className="chips">
          {(['normal', 'large'] as const).map((v) => (
            <button key={v} type="button" className="chip" aria-pressed={p.fontScale === v} onClick={() => run((s) => updatePrefs(s, member.id, { fontScale: v }))}>
              {v === 'normal' ? '보통' : '크게'}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="stack-sm">
        <legend className="strong">읽어주기 속도</legend>
        <div className="chips">
          {(['normal', 'slow'] as const).map((v) => (
            <button key={v} type="button" className="chip" aria-pressed={p.speechRate === v} onClick={() => run((s) => updatePrefs(s, member.id, { speechRate: v }))}>
              {v === 'normal' ? '보통' : '천천히'}
            </button>
          ))}
        </div>
        {!speechSupported() && <p className="hint">이 브라우저는 읽어주기를 지원하지 않아요.</p>}
      </fieldset>
      <fieldset className="stack-sm">
        <legend className="strong">앱 안 알림 (홈 화면 새 소식)</legend>
        {(Object.keys(NOTI_LABEL) as (keyof NotificationPrefs)[]).map((k) => (
          <label key={k} className="choice">
            <input type="checkbox" checked={p.notifications[k]} onChange={(e) => run((s) => updatePrefs(s, member.id, { notifications: { ...p.notifications, [k]: e.target.checked } }))} />
            <span className="check" aria-hidden="true">
              {p.notifications[k] ? '✓' : ''}
            </span>
            <span>
              {NOTI_LABEL[k]}
              <span className="sub">{p.notifications[k] ? '켜짐' : '꺼짐'}</span>
            </span>
          </label>
        ))}
        <p className="hint">문자·푸시 알림은 시제품에 없어요. 앱 안에서만 알려드려요.</p>
      </fieldset>
      <Notice msg={msg} />
    </section>
  );
}

const CATS: InquiryCategory[] = ['booking', 'membership', 'body', 'mall', 'other'];

export function HelpPage() {
  const state = useAppState();
  const member = findMember(state, state.demo.memberId)!;
  const [cat, setCat] = useState<InquiryCategory>('booking');
  const [text, setText] = useState('');
  const { run, msg, setMsg } = useRunner();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 2) {
      setMsg({ kind: 'error', text: '도움이 필요한 내용을 적어 주세요.' });
      return;
    }
    const r = run((s, n) => createInquiry(s, member.id, cat, text, n), '보냈어요');
    if (r.ok) setText('');
  };
  return (
    <div className="stack-lg">
      <PageNav back="/member/me" home="/member" />
      <PageHead title="도움 요청" desc="궁금하거나 어려운 점을 남겨 주세요. 온유 담당자가 확인하고 답변해 드려요. 현장에서는 라운지 안내 데스크에 말씀하셔도 돼요." />
      <form className="panel stack" onSubmit={submit}>
        <fieldset className="stack-sm">
          <legend className="strong">어떤 도움이 필요하세요?</legend>
          <div className="chips" role="radiogroup" aria-label="문의 종류">
            {CATS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={cat === c} className="chip" onClick={() => setCat(c)}>
                {INQUIRY_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="help-text">내용 (500자까지)</label>
          <textarea id="help-text" className="textarea" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 다음 주 예약을 바꾸고 싶어요" />
        </div>
        <button type="submit" className="btn btn-primary btn-block">
          도움 요청 보내기
        </button>
        <Notice msg={msg} />
      </form>
      <section className="stack" aria-labelledby="my-iq">
        <h2 id="my-iq">내가 보낸 요청</h2>
        <InquiryList memberId={member.id} />
      </section>
    </div>
  );
}
