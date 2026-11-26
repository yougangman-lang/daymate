import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppState, useNow, useStore } from '../../store/store';
import type { Booking, Member } from '../../domain/types';
import { displayName, findMember, memberMeasurements, roster, staffName, trialUsage, waitingList } from '../../domain/selectors';
import { endTimeLabel, GAMES, getSession, PHASES, sessionsOn, sessionStart } from '../../domain/schedule';
import { addDays, formatDate, formatDateTime, isWeekday, seoulDate, seoulDateTime } from '../../lib/time';
import { ackCondition, markAttendance } from '../../services/booking';
import { followUpFeedback, saveFeedback } from '../../services/feedback';
import { setClock, setDemo } from '../../services/demo';
import { ConditionSummary } from '../../components/ConditionForm';
import { Empty, Notice, PageNav, useRunner } from '../../components/ui';
import { SessionRow } from './Home';

export function ClassesPage() {
  const state = useAppState();
  const now = useNow();
  const today = seoulDate(now);
  const [params, setParams] = useSearchParams();
  const days = Array.from({ length: 22 }, (_, i) => addDays(today, i - 10)).filter(isWeekday);
  const date = params.get('date') && isWeekday(params.get('date')!) ? params.get('date')! : isWeekday(today) ? today : days.find((d) => d > today)!;
  const sessions = sessionsOn(date);
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">수업 관리</span>
        <h1>{formatDate(date, true)}</h1>
        <p>하루 7개 시간대 · 수업 60분 · 정원 6명 · 매니저 1명과 코치 2명 배치. 한 공간에서 한 수업만 운영해요.</p>
      </header>
      <div className="chips date-chips" role="group" aria-label="날짜 선택">
        {days.map((d) => (
          <button key={d} type="button" className="chip" aria-pressed={d === date} onClick={() => setParams({ date: d })}>
            {formatDate(d).replace(/^\d+월 /, '')}
            {d === today && ' 오늘'}
          </button>
        ))}
      </div>
      <ul className="session-list">
        {sessions.map((s) => (
          <SessionRow key={s.id} s={s} state={state} now={now} />
        ))}
      </ul>
      <p className="small muted">출석은 회원마다 따로 처리해요. 실수를 막기 위해 일괄 출석 버튼은 두지 않았어요.</p>
    </div>
  );
}

export function SessionPage() {
  const { sessionId = '' } = useParams();
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const navigate = useNavigate();
  const { run, msg } = useRunner();
  const s = getSession(sessionId);
  const isManager = state.demo.staffKind === 'manager';
  const staffId = isManager ? state.demo.managerId : state.demo.coachId;
  if (!s) return <Empty title="수업을 찾을 수 없어요" />;
  const isMine = isManager || s.coachIds.includes(state.demo.coachId as never);
  const list = roster(state, s.id);
  const queue = waitingList(state, s.id);
  const today = seoulDate(now);
  const beforeDay = s.date > today;

  if (!isMine) {
    return (
      <div className="stack">
        <PageNav back="/staff" home="/staff" />
        <Empty title="담당하지 않는 수업이에요">코치는 배치된 수업의 명단만 볼 수 있어요. 담당 코치: {s.coachIds.map((c) => staffName(state, c)).join(', ')}</Empty>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <PageNav back={isManager ? `/staff/classes?date=${s.date}` : '/staff'} home="/staff" />
      <header className="page-head">
        <span className="eyebrow">
          {formatDate(s.date, true)} · {s.slot} ~ {endTimeLabel(s.slot)}
        </span>
        <h1>{s.program.title}</h1>
        <p>
          주요 동작: {s.program.focus} · 연계 게임: {GAMES[s.program.game].name}
        </p>
      </header>
      <section className="panel-flat stack-sm">
        <div className="row">
          <span className="tag tag-ok">배치 확인: 매니저 1 · 코치 2</span>
          <span>
            매니저 {staffName(state, s.managerId)} · 코치 {s.coachIds.map((c) => `${staffName(state, c)}(가상)`).join(', ')}
          </span>
        </div>
        <p className="small">{PHASES.map((p) => `${p.label} ${p.minutes}분`).join(' → ')}</p>
        <p className="small">
          예약 {list.length}/{s.capacity}명 · 대기 {queue.length}명
        </p>
      </section>

      {isManager && beforeDay && list.length > 0 && (
        <Notice msg={{ kind: 'info', title: '아직 수업 날짜가 아니에요', text: '출석은 수업 당일부터 처리할 수 있어요. 발표 시연에서는 기준 시각을 이 수업 시작으로 옮겨 진행할 수 있어요.' }}>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => run((st) => setClock(st, seoulDateTime(s.date, s.slot)))}>
              시연: 기준 시각을 이 수업 시작({s.slot})으로 옮기기
            </button>
          </div>
        </Notice>
      )}
      {isManager && (
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              store.run((st) => setDemo(st, { staffKind: 'coach', coachId: s.coachIds[0] }));
              navigate(`/staff/classes/${s.id}`);
            }}
          >
            코치 화면에서 이 수업 열기 (코치 {staffName(state, s.coachIds[0])})
          </button>
        </div>
      )}
      <Notice msg={msg} />

      <section className="stack" aria-labelledby="roster-h">
        <h2 id="roster-h">명단</h2>
        {list.length === 0 ? (
          <Empty title="예약한 회원이 없어요" />
        ) : (
          <ul className="stack" style={{ listStyle: 'none' }}>
            {list.map((b) => (
              <RosterCard key={b.id} booking={b} member={findMember(state, b.memberId)!} isManager={isManager} staffId={staffId} canAttend={!beforeDay} started={sessionStart(s) <= now} />
            ))}
          </ul>
        )}
      </section>

      {queue.length > 0 && (
        <section className="stack-sm" aria-labelledby="queue-h">
          <h2 id="queue-h">대기 명단</h2>
          <ol className="plain-list">
            {queue.map((w) => (
              <li key={w.id}>
                {displayName(findMember(state, w.memberId))} · {w.status === 'offered' ? '자리 알림 보냄 (회원 확정 전)' : '대기 중'} · 신청 {formatDateTime(w.createdAt)}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

const ATT_LABEL = { booked: '출석 처리 전', attended: '출석', absent: '결석', cancelled: '취소' } as const;

function RosterCard({ booking: b, member, isManager, staffId, canAttend, started }: { booking: Booking; member: Member; isManager: boolean; staffId: string; canAttend: boolean; started: boolean }) {
  const state = useAppState();
  const now = useNow();
  const { run, msg } = useRunner();
  const latest = memberMeasurements(state, member.id).find((m) => m.explanation.status === 'published' && m.explanation.coachNote);
  const adjusts = member.careNotes.filter((c) => c.kind === 'adjust').slice(0, 2);
  const t = trialUsage(state, member.id, now);
  const fb = state.feedback.find((f) => f.bookingId === b.id);
  return (
    <li id={`bk-${b.id}`} className="panel stack roster-card">
      <div className="row between">
        <h3>{displayName(member)}</h3>
        <div className="row">
          <span className="tag tag-neutral">{b.kind === 'trial' ? `무료체험 (사용 ${t.used}/2)` : '유료 무제한'}</span>
          <span className={`tag ${b.status === 'attended' ? 'tag-ok' : b.status === 'absent' ? 'tag-danger' : 'tag-warn'}`}>{ATT_LABEL[b.status]}</span>
        </div>
      </div>
      <div className="roster-grid">
        <div className="stack-sm">
          <span className="small strong">오늘 컨디션</span>
          <span>
            <ConditionSummary booking={b} />
          </span>
          {b.condition &&
            (b.condition.checkedBy ? (
              <span className="small muted">
                {staffName(state, b.condition.checkedBy)} 확인 · {formatDateTime(b.condition.checkedAt!)}
              </span>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => run((st, n) => ackCondition(st, staffId, b.id, n))}>
                컨디션 확인했어요
              </button>
            ))}
        </div>
        <div className="stack-sm">
          <span className="small strong">주의사항·운동 조정</span>
          {member.precautions.length === 0 && adjusts.length === 0 && !latest ? (
            <span className="small muted">등록된 주의사항이 없어요</span>
          ) : (
            <ul className="plain-list small">
              {member.precautions.map((p) => (
                <li key={p}>{p}</li>
              ))}
              {adjusts.map((a) => (
                <li key={a.id}>조정: {a.text}</li>
              ))}
              {latest && <li>측정 후 지도 사항: {latest.explanation.coachNote}</li>}
            </ul>
          )}
          {member.exercisePlan && <span className="small muted">운동 방향: {member.exercisePlan.text}</span>}
        </div>
      </div>
      {isManager && (
        <div className="stack-sm">
          <span className="small strong">출석 처리</span>
          {canAttend ? (
            <div className="btn-row">
              <button type="button" className={`btn ${b.status === 'attended' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={b.status === 'attended'} onClick={() => run((st, n) => markAttendance(st, staffId, b.id, 'attended', n))}>
                출석
              </button>
              <button type="button" className={`btn ${b.status === 'absent' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={b.status === 'absent'} onClick={() => run((st, n) => markAttendance(st, staffId, b.id, 'absent', n))}>
                결석
              </button>
              {b.status !== 'booked' && (
                <button type="button" className="btn btn-ghost" onClick={() => run((st, n) => markAttendance(st, staffId, b.id, 'booked', n))}>
                  되돌리기
                </button>
              )}
            </div>
          ) : (
            <span className="small muted">수업 당일부터 처리할 수 있어요.</span>
          )}
          {!started && canAttend && <span className="tiny muted">수업 시작 전 도착 확인으로도 처리할 수 있어요.</span>}
        </div>
      )}
      <Notice msg={msg} />
      {!isManager && b.status === 'attended' && <FeedbackForm bookingId={b.id} coachId={staffId} />}
      {!isManager && b.status !== 'attended' && <p className="small muted">피드백은 매니저가 출석을 처리한 뒤 작성할 수 있어요.</p>}
      {isManager && fb && (
        <p className="small">
          코치 피드백: <strong>{fb.status === 'published' ? '공개됨' : '초안'}</strong>
          {fb.response && ` · 회원 응답: ${fb.response === 'understood' ? '이해했어요' : '설명이 더 필요해요'}`} · <Link to="/staff/feedback">피드백 확인</Link>
        </p>
      )}
    </li>
  );
}

function FeedbackForm({ bookingId, coachId }: { bookingId: string; coachId: string }) {
  const state = useAppState();
  const existing = state.feedback.find((f) => f.bookingId === bookingId);
  const b = state.bookings.find((x) => x.id === bookingId)!;
  const s = getSession(b.sessionId)!;
  const [activity, setActivity] = useState(existing?.activity ?? `${s.program.focus}, ${GAMES[s.program.game].name}`);
  const [didWell, setDidWell] = useState(existing?.didWell ?? '');
  const [nextAdjust, setNextAdjust] = useState(existing?.nextAdjust ?? '');
  const [follow, setFollow] = useState('');
  const { run, msg } = useRunner();
  const id = `fb-${bookingId}`;
  const save = (publish: boolean) => run((st, n) => saveFeedback(st, coachId, bookingId, { activity, didWell, nextAdjust }, publish, n));
  return (
    <div className="panel-soft stack">
      <div className="row between">
        <h4>개인 피드백</h4>
        <span className={`tag ${existing?.status === 'published' ? 'tag-ok' : 'tag-neutral'}`}>{existing ? (existing.status === 'published' ? '공개됨 · 회원에게 보임' : '초안 · 회원에게 안 보임') : '작성 전'}</span>
      </div>
      <div className="field">
        <label htmlFor={`${id}-a`}>오늘 한 활동</label>
        <input id={`${id}-a`} className="input" maxLength={200} value={activity} onChange={(e) => setActivity(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-w`}>잘 수행한 점</label>
        <textarea id={`${id}-w`} className="textarea" maxLength={300} value={didWell} onChange={(e) => setDidWell(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${id}-n`}>다음에 조정할 점</label>
        <textarea id={`${id}-n`} className="textarea" maxLength={300} value={nextAdjust} onChange={(e) => setNextAdjust(e.target.value)} />
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={() => save(false)}>
          초안 저장
        </button>
        <button type="button" className="btn btn-primary" onClick={() => save(true)}>
          {existing?.status === 'published' ? '수정 내용 공개' : '회원에게 공개'}
        </button>
      </div>
      <Notice msg={msg} />
      {existing?.status === 'published' && (
        <div className="stack-sm">
          <span className="small">
            회원 응답: <strong>{existing.response === 'understood' ? '이해했어요' : existing.response === 'need_more' ? '설명이 더 필요해요' : '아직 응답 없음'}</strong>
          </span>
          {existing.response === 'need_more' &&
            (existing.followUp ? (
              <span className="small">추가 설명 보냄: {existing.followUp.text}</span>
            ) : (
              <>
                <div className="field">
                  <label htmlFor={`${id}-f`}>추가 설명</label>
                  <textarea id={`${id}-f`} className="textarea" maxLength={300} value={follow} onChange={(e) => setFollow(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary" onClick={() => run((st, n) => followUpFeedback(st, coachId, existing.id, follow, n))}>
                  추가 설명 보내기
                </button>
              </>
            ))}
        </div>
      )}
    </div>
  );
}
