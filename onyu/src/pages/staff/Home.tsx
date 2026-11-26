import { Link } from 'react-router-dom';
import { useAppState, useNow } from '../../store/store';
import type { AppState } from '../../domain/types';
import { displayName, findMember, staffName } from '../../domain/selectors';
import { getSession, sessionsOn, sessionStart, type Session } from '../../domain/schedule';
import { addDays, formatDate, isWeekday, seoulDate, shiftWeekdays } from '../../lib/time';
import { sessionSummary } from '../../services/booking';
import { Empty } from '../../components/ui';
import { coachTodo, opsSummary } from './counts';

export function StaffHome() {
  const state = useAppState();
  return state.demo.staffKind === 'manager' ? <ManagerToday /> : <CoachHome />;
}

export function SessionRow({ s, state, now, highlightCoach }: { s: Session; state: AppState; now: Date; highlightCoach?: string }) {
  const sum = sessionSummary(state, s);
  const started = sessionStart(s) <= now;
  return (
    <li>
      <Link className="session-row" to={`/staff/classes/${s.id}`}>
        <span className="t num">
          <strong>{s.slot}</strong>
          <span className="tiny muted">{formatDate(s.date).replace(/^\d+월 /, '')}</span>
        </span>
        <span className="b">
          <strong>{s.program.title}</strong>
          <span className="small">
            매니저 {staffName(state, s.managerId)} · 코치 {s.coachIds.map((c) => (c === highlightCoach ? `${staffName(state, c)}(나)` : staffName(state, c))).join(', ')}
          </span>
        </span>
        <span className="m">
          <span className={`tag ${sum.left === 0 ? 'tag-danger' : sum.left === 1 ? 'tag-warn' : 'tag-neutral'}`}>
            예약 {sum.booked}/{s.capacity}
          </span>
          {sum.trial > 0 && <span className="tag tag-neutral">체험 {sum.trial}</span>}
          {sum.waiting > 0 && <span className="tag tag-warn">대기 {sum.waiting}</span>}
          {sum.unchecked > 0 && <span className="tag tag-danger">컨디션 미확인 {sum.unchecked}</span>}
          {started && sum.booked > 0 && <span className="tag tag-ok">출석 {sum.attended}/{sum.booked}</span>}
        </span>
      </Link>
    </li>
  );
}

function ManagerToday() {
  const state = useAppState();
  const now = useNow();
  const o = opsSummary(state, now);
  const nextDay = isWeekday(o.today) ? o.today : shiftWeekdays(o.today, 1);
  const sessions = sessionsOn(nextDay);
  const dayBooked = state.bookings.filter((b) => b.status !== 'cancelled' && sessions.some((s) => s.id === b.sessionId)).length;

  const cards = [
    { label: isWeekday(o.today) ? '오늘 예약 인원' : `${formatDate(nextDay)} 예약 인원`, value: `${dayBooked}명`, sub: `${sessions.length}개 수업 · 수업당 정원 6명`, to: `/staff/classes?date=${nextDay}` },
    { label: '출석 처리 대기', value: `${o.attendanceDue.length}명`, sub: '오늘 시작한 수업의 예약자', to: `/staff/classes?date=${o.today}` },
    { label: '미확인 컨디션', value: `${o.uncheckedConditions.length}건`, sub: '앞으로 7일 예약', to: '#conditions' },
    { label: '대기 신청', value: `${o.waiting.length}명`, sub: '앞으로의 수업', to: '#waiting' },
    { label: '설명 확인 전 측정', value: `${o.pendingMeasurements.length}건`, sub: '공개 전 (회원에게는 원본만 표시)', to: '/staff/measurements' },
    { label: '미답변 문의', value: `${o.openInquiries.length}건`, sub: '회원 도움 요청', to: '/staff/inquiries' },
    { label: '추가 설명 요청', value: `${o.needMore.length}건`, sub: '피드백 “설명이 더 필요해요”', to: '/staff/feedback?filter=need_more' },
  ];

  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">오늘의 운영</span>
        <h1>{formatDate(o.today, true)}</h1>
        <p>저장된 예약·측정·문의에서 계산한 현황이에요.{!isWeekday(o.today) && ' 오늘은 주말 휴무라 다음 운영일을 보여드려요.'}</p>
      </header>
      <ul className="ops-grid">
        {cards.map((c) => (
          <li key={c.label}>
            {c.to.startsWith('#') ? (
              <a className="ops-card" href={c.to}>
                <span className="l">{c.label}</span>
                <span className="v num">{c.value}</span>
                <span className="s">{c.sub}</span>
              </a>
            ) : (
              <Link className="ops-card" to={c.to}>
                <span className="l">{c.label}</span>
                <span className="v num">{c.value}</span>
                <span className="s">{c.sub}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      <section className="stack" aria-labelledby="tl-h">
        <div className="section-title">
          <h2 id="tl-h">{isWeekday(o.today) ? '오늘 수업' : `${formatDate(nextDay)} 수업`}</h2>
          <Link to="/staff/classes">수업 관리 열기</Link>
        </div>
        <ul className="session-list">
          {sessions.map((s) => (
            <SessionRow key={s.id} s={s} state={state} now={now} />
          ))}
        </ul>
      </section>

      <section id="conditions" className="stack" aria-labelledby="cd-h">
        <h2 id="cd-h">확인하지 않은 컨디션</h2>
        {o.uncheckedConditions.length === 0 ? (
          <Empty title="확인할 컨디션이 없어요" />
        ) : (
          <ul className="stack-sm" style={{ listStyle: 'none' }}>
            {o.uncheckedConditions.map((b) => {
              const s = getSession(b.sessionId)!;
              return (
                <li key={b.id}>
                  <Link className="line-link" to={`/staff/classes/${s.id}`}>
                    <strong>{displayName(findMember(state, b.memberId))}</strong> · {formatDate(s.date)} {s.slot} · {b.condition?.level === 'good' ? '좋아요' : b.condition?.level === 'tired' ? '조금 피곤해요' : '불편한 곳이 있어요'}
                    {b.condition?.tags.length ? ` (${b.condition.tags.join(', ')})` : ''}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="waiting" className="stack" aria-labelledby="wt-h">
        <h2 id="wt-h">대기 신청</h2>
        {o.waiting.length === 0 ? (
          <Empty title="대기 중인 회원이 없어요" />
        ) : (
          <ul className="stack-sm" style={{ listStyle: 'none' }}>
            {o.waiting.map((w) => {
              const s = getSession(w.sessionId)!;
              return (
                <li key={w.id}>
                  <Link className="line-link" to={`/staff/classes/${s.id}`}>
                    <strong>{displayName(findMember(state, w.memberId))}</strong> · {formatDate(s.date)} {s.slot} · {w.status === 'offered' ? '자리 알림 보냄 (회원 확정 대기)' : '대기 중'}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CoachHome() {
  const state = useAppState();
  const now = useNow();
  const coachId = state.demo.coachId;
  const today = seoulDate(now);
  const todo = coachTodo(state, coachId, now);
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i)).filter(isWeekday);
  const mine = days.flatMap((d) => sessionsOn(d).filter((s) => s.coachIds.includes(coachId as never)));
  const upcoming = mine.filter((s) => sessionSummary(state, s).booked > 0 || s.date === today);
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">코치 화면</span>
        <h1>담당 수업</h1>
        <p>회원 주의사항·운동 조정 내역·컨디션을 보고 수업을 준비하세요. 회원권·제휴몰·전체 문진 관리는 매니저 화면에서만 해요.</p>
      </header>

      <section className="stack" aria-labelledby="todo-h">
        <h2 id="todo-h">피드백 작성이 필요한 회원</h2>
        {todo.writeNeeded.length === 0 ? (
          <Empty title="작성할 피드백이 없어요">매니저가 출석을 처리하면 여기에 표시돼요.</Empty>
        ) : (
          <ul className="stack-sm" style={{ listStyle: 'none' }}>
            {todo.writeNeeded.map((b) => {
              const s = getSession(b.sessionId)!;
              const draft = state.feedback.find((f) => f.bookingId === b.id);
              return (
                <li key={b.id}>
                  <Link className="line-link" to={`/staff/classes/${s.id}#bk-${b.id}`}>
                    <strong>{displayName(findMember(state, b.memberId))}</strong> · {formatDate(s.date)} {s.slot} {s.program.title} · {draft ? '초안 저장됨' : '작성 전'}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {todo.needMore.length > 0 && (
        <section className="stack" aria-labelledby="nm-h">
          <h2 id="nm-h">“설명이 더 필요해요” 요청</h2>
          <ul className="stack-sm" style={{ listStyle: 'none' }}>
            {todo.needMore.map((f) => {
              const s = getSession(f.sessionId)!;
              return (
                <li key={f.id}>
                  <Link className="line-link" to={`/staff/classes/${s.id}#bk-${f.bookingId}`}>
                    <strong>{displayName(findMember(state, f.memberId))}</strong> · {formatDate(s.date)} {s.slot} 피드백에 추가 설명 요청
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="stack" aria-labelledby="up-h">
        <h2 id="up-h">앞으로 7일 담당 수업</h2>
        {upcoming.length === 0 ? (
          <Empty title="예약이 있는 담당 수업이 없어요" />
        ) : (
          <ul className="session-list">
            {upcoming.map((s) => (
              <SessionRow key={s.id} s={s} state={state} now={now} highlightCoach={coachId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
