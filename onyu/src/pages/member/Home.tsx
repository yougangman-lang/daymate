import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useNow } from '../../store/store';
import { displayName, findMember, memberFeedback, memberStatus, staffName, unreadNotifications, upcomingBookings } from '../../domain/selectors';
import { endTimeLabel, GAMES, getSession, PHASES, PLAN_INFO, SLOTS } from '../../domain/schedule';
import { formatDate } from '../../lib/time';
import { confirmOffer } from '../../services/booking';
import { markNotificationsRead } from '../../services/member';
import { ConditionForm, ConditionSummary } from '../../components/ConditionForm';
import { Icon, type IconName } from '../../components/Icon';
import { Notice, useRunner } from '../../components/ui';
import { MembershipLine } from './shared';

export function MemberHome() {
  const state = useAppState();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const status = memberStatus(state, member, now);
  const upcoming = upcomingBookings(state, member.id, now);
  const next = upcoming[0];
  const alerts = unreadNotifications(state, member).filter((n) => n.type !== 'waitlist');
  const offers = state.waitlist.filter((w) => w.memberId === member.id && w.status === 'offered');
  const unanswered = memberFeedback(state, member.id).filter((f) => !f.response);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const { run, msg } = useRunner();

  const actions: { text: string; to: string }[] = [];
  if (next && !next.booking.condition) actions.push({ text: '다음 수업 전에 컨디션을 알려주세요.', to: '/member/me#bookings' });
  if (unanswered.length) actions.push({ text: `코치 피드백 ${unanswered.length}건을 읽고 응답해 주세요.`, to: '/member/body#feedback' });
  if (status.kind === 'paid' && status.daysLeft <= 7) actions.push({ text: `회원권이 ${status.daysLeft}일 남았어요. 연장은 매니저에게 문의해 주세요.`, to: '/member/me/help' });
  if (status.kind === 'trial' && status.remaining > 0) actions.push({ text: `무료체험이 ${status.remaining}회 남았어요. 수업을 예약해 보세요.`, to: '/member/book' });
  if (status.kind === 'expired' || status.kind === 'paused') actions.push({ text: '회원권 상태를 확인하려면 매니저에게 도움을 요청해 주세요.', to: '/member/me/help' });
  if (!next && (status.kind === 'paid' || (status.kind === 'trial' && status.remaining > 0))) actions.push({ text: '예정된 수업이 없어요. 다음 수업을 예약해 보세요.', to: '/member/book' });

  const shortcuts: { to: string; label: string; icon: IconName }[] = [
    { to: '/member/book', label: '수업 예약하기', icon: 'calendar' },
    { to: '/member/body', label: '내 몸 알아보기', icon: 'body' },
    { to: '/member/body#feedback', label: '코치 설명 보기', icon: 'clipboard' },
    { to: '/member/mall', label: '회원 혜택 보기', icon: 'gift' },
  ];

  return (
    <div className="stack-lg">
      <section className="greet">
        <h1>{displayName(member)} 님, 안녕하세요</h1>
        <p className="muted">오늘도 함께 움직여요.</p>
      </section>

      {offers.map((w) => {
        const s = getSession(w.sessionId)!;
        return (
          <section key={w.id} className="panel stack offer" aria-labelledby={`offer-${w.id}`}>
            <h2 id={`offer-${w.id}`}>대기하신 수업에 자리가 생겼어요</h2>
            <p>
              {formatDate(s.date)} {s.slot} · {s.program.title}
            </p>
            <p className="small muted">알림만으로는 예약이 확정되지 않아요. 아래 버튼을 눌러야 예약돼요. 먼저 확정한 분께 자리가 돌아가요.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => run((st, n) => confirmOffer(st, member.id, w.id, n))}>
              예약 확정하기
            </button>
          </section>
        );
      })}
      <Notice msg={msg} />

      <section className="panel next-card" aria-labelledby="next-title">
        <div className="section-title">
          <h2 id="next-title">다음 예약</h2>
          {upcoming.length > 1 && (
            <Link to="/member/me#bookings" className="small">
              예약 {upcoming.length}건 모두 보기
            </Link>
          )}
        </div>
        {next ? (
          <div className="stack">
            <div className="next-when">
              <span className="date">{formatDate(next.session.date)}</span>
              <span className="time num">
                {next.session.slot} ~ {endTimeLabel(next.session.slot)}
              </span>
            </div>
            <dl className="kv">
              <dt>활동</dt>
              <dd>
                {next.session.program.title} + {GAMES[next.session.program.game].name}
              </dd>
              <dt>담당 지도자</dt>
              <dd>
                매니저 {staffName(state, next.session.managerId)} · 코치 {next.session.coachIds.map((c) => staffName(state, c)).join(', ')}
              </dd>
              <dt>컨디션</dt>
              <dd>
                <ConditionSummary booking={next.booking} />
              </dd>
            </dl>
            {saved && !editing && <Notice msg={{ kind: 'ok', text: '컨디션을 전달했어요. 매니저와 담당 코치가 수업 전에 확인해요.' }} />}
            {editing ? (
              <div className="panel-soft">
                <ConditionForm
                  booking={next.booking}
                  memberId={member.id}
                  onDone={() => {
                    setEditing(false);
                    setSaved(true);
                  }}
                />
              </div>
            ) : (
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setEditing(true)}>
                {next.booking.condition ? '컨디션 다시 알려주기' : '수업 전 컨디션 알려주기'}
              </button>
            )}
          </div>
        ) : (
          <div className="stack">
            <p>예정된 수업이 없어요.</p>
            <Link className="btn btn-primary" to="/member/book">
              수업 예약하기
            </Link>
          </div>
        )}
      </section>

      <nav aria-label="바로가기" className="shortcuts">
        {shortcuts.map((s) => (
          <Link key={s.label} to={s.to} className="shortcut">
            <Icon name={s.icon} size={34} />
            <span>{s.label}</span>
          </Link>
        ))}
      </nav>

      <Link className="btn btn-secondary btn-block" to="/facility" state={{ from: '/member' }}>
        <Icon name="info" size={22} /> 시설 둘러보기
      </Link>

      {alerts.length > 0 && (
        <section aria-labelledby="alert-title" className="stack">
          <div className="section-title">
            <h2 id="alert-title">새 소식 {alerts.length}건</h2>
            <button type="button" className="link-btn" onClick={() => run((s) => markNotificationsRead(s, member.id, alerts.map((a) => a.id)))}>
              모두 읽음으로 표시
            </button>
          </div>
          <ul className="alert-list">
            {alerts.slice(0, 4).map((a) => (
              <li key={a.id}>
                <Link to={a.link} onClick={() => run((s) => markNotificationsRead(s, member.id, [a.id]))} className="alert-item">
                  <Icon name="bell" />
                  <span>
                    <strong>{a.title}</strong>
                    <span className="small muted">{a.body}</span>
                  </span>
                  <span className="go">보기</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel-flat stack-sm" aria-labelledby="ms-title">
        <h2 id="ms-title">내 회원권</h2>
        <MembershipLine state={state} member={member} now={now} />
      </section>

      {actions.length > 0 && (
        <section aria-labelledby="todo-title" className="stack-sm">
          <h2 id="todo-title">다음에 할 일</h2>
          <ul className="todo-list">
            {actions.map((a) => (
              <li key={a.text}>
                <Link to={a.to}>
                  <span>{a.text}</span>
                  <Icon name="back" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="fold">
        <summary>운영 안내</summary>
        <div className="fold-body stack small">
          <p>
            <strong>운영 시간</strong> 평일만 운영해요 (주말 휴무). 수업 시작: {SLOTS.join(' / ')}
          </p>
          <p>
            <strong>수업 구성 (60분, 정원 6명)</strong> {PHASES.map((p) => `${p.label} ${p.minutes}분`).join(' → ')}. 매니저 1명과 코치 2명이 함께해요. 같은 수업 안에서 무게·반복·휴식을 한 분씩 조정해요.
          </p>
          <p>
            <strong>회원권</strong> {PLAN_INFO['1m'].label} {PLAN_INFO['1m'].price.toLocaleString('ko-KR')}원 · {PLAN_INFO['3m'].label} {PLAN_INFO['3m'].price.toLocaleString('ko-KR')}원 (시연 가격). 예약제로 횟수 제한이 없어요. 신규 무료체험은 2회예요.
          </p>
          <p>
            <strong>방문 편의</strong> 라운지·커피·안마의자·샤워시설은 방문하시면 편하게 이용하실 수 있어요. 따로 예약하지 않아요.
          </p>
          <p>
            <strong>예약</strong> 수업 7일 전부터 예약할 수 있어요. 정원이 차면 대기 신청을 할 수 있고, 자리가 생기면 앱에서 알려드려요.
          </p>
        </div>
      </details>
    </div>
  );
}
