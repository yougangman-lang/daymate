// 수업 예약: 날짜 선택 → 활동·시간·잔여석 확인 → 예약 확인 → 완료
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppState, useNow } from '../../store/store';
import { findMember, memberStatus, seatsLeft, staffName, trialUsage, waitingList } from '../../domain/selectors';
import { BOOKING_WINDOW_DAYS, endTimeLabel, GAMES, getSession, PHASES, sessionsOn, sessionStart, type Session } from '../../domain/schedule';
import { addDays, formatDate, isWeekday } from '../../lib/time';
import { book, bookingWindow, checkBooking, joinWaitlist } from '../../services/booking';
import { ConditionForm } from '../../components/ConditionForm';
import { Icon } from '../../components/Icon';
import { Empty, Notice, PageHead, PageNav, useRunner } from '../../components/ui';
import { MembershipLine } from './shared';
import { StaffNameLink } from '../Coaches';

const STEPS = ['날짜 선택', '시간 선택', '예약 확인', '완료'];

function Steps({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="예약 단계">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined} className={i < current ? 'done' : i === current ? 'now' : ''}>
          <span className="n">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function BookPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get('date');
  const sessionId = params.get('session');
  if (sessionId) return <ConfirmStep sessionId={sessionId} onBack={() => setParams(date ? { date } : {})} />;
  if (date) return <SlotStep date={date} />;
  return <DateStep />;
}

function DateStep() {
  const state = useAppState();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const { from } = bookingWindow(now);
  const days = Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => addDays(from, i));
  return (
    <div className="stack-lg">
      <PageHead title="수업 예약" desc="수업 날짜를 골라 주세요. 수업 7일 전부터 예약할 수 있어요." />
      <Steps current={0} />
      <div className="panel-flat">
        <MembershipLine state={state} member={member} now={now} />
      </div>
      <ul className="date-grid" aria-label="예약 가능한 날짜">
        {days.map((d) => {
          const open = isWeekday(d);
          const sessions = sessionsOn(d).filter((s) => sessionStart(s) > now);
          const available = sessions.filter((s) => seatsLeft(state, s) > 0).length;
          const disabled = !open || sessions.length === 0;
          const label = !open ? '주말 휴무' : sessions.length === 0 ? '오늘 수업 종료' : available ? `예약 가능 ${available}개` : '모두 마감 · 대기 가능';
          return (
            <li key={d}>
              {disabled ? (
                <div className="date-btn disabled" aria-disabled="true">
                  <span className="d">{formatDate(d)}</span>
                  <span className="s">{label}</span>
                </div>
              ) : (
                <Link className="date-btn" to={`/member/book?date=${d}`}>
                  <span className="d">
                    {formatDate(d)}
                    {d === from && ' · 오늘'}
                  </span>
                  <span className="s">{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SlotStep({ date }: { date: string }) {
  const state = useAppState();
  const now = useNow();
  const memberId = state.demo.memberId;
  const { run, msg } = useRunner();
  const sessions = sessionsOn(date);
  return (
    <div className="stack-lg">
      <PageNav back="/member/book" home="/member" />
      <PageHead title={formatDate(date)} desc="시간과 남은 자리를 확인하고 골라 주세요. 정원은 수업마다 6명이에요." />
      <Steps current={1} />
      <Notice msg={msg} />
      {sessions.length === 0 ? (
        <Empty title="운영하지 않는 날이에요">평일에만 수업이 있어요. 다른 날짜를 골라 주세요.</Empty>
      ) : (
        <ul className="slot-list">
          {sessions.map((s) => (
            <SlotRow key={s.id} session={s} memberId={memberId} now={now} onWait={() => run((st, n) => joinWaitlist(st, memberId, s.id, n), '대기 신청 완료')} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SlotRow({ session: s, memberId, now, onWait }: { session: Session; memberId: string; now: Date; onWait: () => void }) {
  const state = useAppState();
  const left = seatsLeft(state, s);
  const check = checkBooking(state, memberId, s.id, now);
  const queue = waitingList(state, s.id);
  const myWait = queue.findIndex((w) => w.memberId === memberId);
  const past = sessionStart(s) <= now;
  return (
    <li className={`slot ${past ? 'is-past' : ''}`}>
      <div className="slot-time num">
        <strong>{s.slot}</strong>
        <span className="small muted">~ {endTimeLabel(s.slot)}</span>
      </div>
      <div className="slot-body">
        <strong>{s.program.title}</strong>
        <span className="small">연계 게임: {GAMES[s.program.game].name}</span>
        <span className="seats">
          {past ? (
            <span className="tag tag-neutral">지난 수업</span>
          ) : left === 0 ? (
            <span className="tag tag-danger">마감 (6/6)</span>
          ) : left === 1 ? (
            <span className="tag tag-warn">잔여 1석</span>
          ) : (
            <span className="tag tag-ok">잔여 {left}석</span>
          )}
          {!past && left === 0 && queue.length > 0 && <span className="small muted"> 대기 {queue.length}명</span>}
        </span>
      </div>
      <div className="slot-action">
        {past ? null : !check.ok && check.code === 'duplicate' ? (
          <span className="tag tag-ok">
            <Icon name="check" size={16} /> 예약함
          </span>
        ) : myWait >= 0 ? (
          <span className="tag tag-warn">대기 {myWait + 1}번째</span>
        ) : check.ok ? (
          <Link className="btn btn-primary" to={`/member/book?date=${s.date}&session=${s.id}`} aria-label={`${s.slot} ${s.program.title} 선택`}>
            선택
          </Link>
        ) : check.code === 'full' ? (
          <button type="button" className="btn btn-secondary" onClick={onWait} aria-label={`${s.slot} 수업 대기 신청`}>
            대기 신청
          </button>
        ) : (
          <span className="small err-text">{check.error}</span>
        )}
      </div>
    </li>
  );
}

function ConfirmStep({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const state = useAppState();
  const now = useNow();
  const navigate = useNavigate();
  const member = findMember(state, state.demo.memberId)!;
  const { run, msg } = useRunner();
  const s = getSession(sessionId);
  if (!s) return <Empty title="수업을 찾을 수 없어요" />;
  const check = checkBooking(state, member.id, s.id, now);
  const t = trialUsage(state, member.id, now);
  const st = memberStatus(state, member, now);

  const submit = () => {
    const r = run((x, n) => book(x, member.id, s.id, n));
    if (r.ok) navigate(`/member/book/done/${r.value.id}`);
  };

  return (
    <div className="stack-lg">
      <PageNav back={`/member/book?date=${s.date}`} home="/member" />
      <PageHead title="예약 내용을 확인해 주세요" />
      <Steps current={2} />
      <section className="panel stack">
        <div className="next-when">
          <span className="date">{formatDate(s.date)}</span>
          <span className="time num">
            {s.slot} ~ {endTimeLabel(s.slot)}
          </span>
        </div>
        <dl className="kv">
          <dt>활동</dt>
          <dd>{s.program.title}</dd>
          <dt>주요 동작</dt>
          <dd>{s.program.focus}</dd>
          <dt>연계 게임</dt>
          <dd>{GAMES[s.program.game].name}</dd>
          <dt>지도자</dt>
          <dd>
            온유 코치 <StaffNameLink id={s.managerId} /> · 코치 {s.coachIds.map((c) => staffName(state, c)).join(', ')}
          </dd>
          <dt>남은 자리</dt>
          <dd>
            {seatsLeft(state, s)}석 / 정원 {s.capacity}명
          </dd>
          <dt>이용 구분</dt>
          <dd>{check.ok && check.kind === 'trial' ? `무료체험 ${t.used + t.reserved + 1}회차 (총 2회)` : st.kind === 'paid' ? '유료 무제한 회원권 · 횟수 차감 없음' : '-'}</dd>
        </dl>
        <p className="small muted">{GAMES[s.program.game].desc}</p>
        <ol className="phase-list">
          {PHASES.map((p) => (
            <li key={p.label}>
              <strong>
                {p.label} {p.minutes}분
              </strong>{' '}
              <span className="small">{p.desc}</span>
            </li>
          ))}
        </ol>
      </section>
      {!check.ok && <Notice msg={{ kind: 'error', title: '지금은 예약할 수 없어요', text: check.error }} />}
      <Notice msg={msg} />
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          다른 시간 고르기
        </button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!check.ok}>
          이 수업 예약하기
        </button>
      </div>
      <p className="small muted">예약은 수업 시작 전까지 내 정보에서 취소할 수 있어요.</p>
    </div>
  );
}

export function BookDone() {
  const { bookingId } = useParams();
  const state = useAppState();
  const memberId = state.demo.memberId;
  const b = state.bookings.find((x) => x.id === bookingId && x.memberId === memberId);
  const [done, setDone] = useState(false);
  if (!b) {
    return (
      <div className="stack">
        <PageNav home="/member" back="/member/book" />
        <Empty title="예약 정보를 찾을 수 없어요">다른 가상 회원으로 바뀌었다면 내 정보에서 예약 내역을 확인해 주세요.</Empty>
      </div>
    );
  }
  const s = getSession(b.sessionId)!;
  return (
    <div className="stack-lg">
      <Steps current={3} />
      <section className="panel stack done-card" aria-labelledby="done-title">
        <div className="done-icon" aria-hidden="true">
          <Icon name="check" size={40} />
        </div>
        <h1 id="done-title">{b.status === 'booked' ? '예약이 완료됐어요' : '예약 상태가 바뀌었어요'}</h1>
        <p className="next-when">
          <span className="date">{formatDate(s.date)}</span>
          <span className="time num">
            {s.slot} ~ {endTimeLabel(s.slot)}
          </span>
        </p>
        <p>
          {s.program.title} + {GAMES[s.program.game].name} · {b.kind === 'trial' ? '무료체험' : '유료 무제한 (횟수 차감 없음)'}
        </p>
      </section>
      {b.status === 'booked' && (
        <section className="panel stack" aria-labelledby="cond-title">
          <h2 id="cond-title">수업 전 컨디션을 알려주세요 (선택)</h2>
          <p className="small muted">알려주신 내용은 매니저와 담당 코치의 수업 화면에 바로 표시돼요.</p>
          {done ? <Notice msg={{ kind: 'ok', text: '컨디션을 전달했어요. 수업 때 반영할게요.' }} /> : <ConditionForm booking={b} memberId={memberId} onDone={() => setDone(true)} />}
        </section>
      )}
      <div className="btn-row">
        <Link className="btn btn-secondary" to="/member/me#bookings">
          예약 내역 보기
        </Link>
        <Link className="btn btn-primary" to="/member">
          홈으로
        </Link>
      </div>
    </div>
  );
}
