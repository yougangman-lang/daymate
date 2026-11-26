import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState, useNow } from '../../store/store';
import type { Member, PlanType } from '../../domain/types';
import { displayName, findMember, memberMeasurements, memberStatus, staffName, STATUS_LABEL, trialUsage, type MemberStatus } from '../../domain/selectors';
import { getSession, PLAN_INFO } from '../../domain/schedule';
import { formatDate, formatDateTime, seoulDate } from '../../lib/time';
import { addCareNote, addMembership, changeEndDate, INQUIRY_LABEL, setExercisePlan, setMembershipStatus, setPrecautions } from '../../services/member';
import { Empty, Notice, PageNav, useRunner } from '../../components/ui';
import { StatusTag } from '../member/shared';

type Filter = 'all' | MemberStatus['kind'];

const DIET = {
  regularity: { regular: '규칙적', sometimes: '가끔 거름', irregular: '불규칙' },
  intakeChange: { same: '비슷함', less: '줄었음', more: '늘었음' },
  proteinFoods: { daily: '거의 매일', sometimes: '주 몇 회', rarely: '거의 안 먹음' },
} as const;

export function MembersPage() {
  const state = useAppState();
  const now = useNow();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const list = state.members.filter((m) => m.name.includes(q.trim()) && (filter === 'all' || memberStatus(state, m, now).kind === filter));
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">회원 관리</span>
        <h1>가상 회원 {state.members.length}명</h1>
      </header>
      <div className="field">
        <label htmlFor="member-search">이름 검색</label>
        <input id="member-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 한보람" />
      </div>
      <div className="chips" role="group" aria-label="회원 상태">
        {(['all', 'paid', 'trial', 'paused', 'expired'] as Filter[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : STATUS_LABEL[f as MemberStatus['kind']]}
          </button>
        ))}
      </div>
      <p className="small" aria-live="polite">
        {list.length}명 표시
      </p>
      {list.length === 0 ? (
        <Empty title="조건에 맞는 회원이 없어요" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th>상태</th>
                <th>기간·체험</th>
                <th className="num">출석</th>
                <th>최근 출석</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const st = memberStatus(state, m, now);
                const att = state.bookings.filter((b) => b.memberId === m.id && b.status === 'attended').map((b) => getSession(b.sessionId)!).sort((a, b) => (a.id < b.id ? 1 : -1));
                return (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/staff/members/${m.id}`}>{displayName(m)}</Link>
                      <div className="tiny muted">{m.ageGroup}</div>
                    </td>
                    <td>
                      <StatusTag state={state} member={m} now={now} />
                    </td>
                    <td className="small">{st.kind === 'trial' ? `체험 ${st.used}/2 사용` : 'membership' in st ? `${st.membership.startDate} ~ ${st.membership.endDate}` : '-'}</td>
                    <td className="num">{att.length}</td>
                    <td className="small">{att[0] ? formatDate(att[0].date) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MemberDetail() {
  const { memberId = '' } = useParams();
  const state = useAppState();
  const now = useNow();
  const m = findMember(state, memberId);
  if (!m) return <Empty title="회원을 찾을 수 없어요" />;
  const t = trialUsage(state, m.id, now);
  const history = state.bookings
    .filter((b) => b.memberId === m.id)
    .map((b) => ({ b, s: getSession(b.sessionId)! }))
    .sort((a, b) => (a.s.id < b.s.id ? 1 : -1));
  const ms = memberMeasurements(state, m.id);
  const inquiries = state.inquiries.filter((q) => q.memberId === m.id);
  return (
    <div className="stack-lg">
      <PageNav back="/staff/members" home="/staff" />
      <header className="page-head">
        <span className="eyebrow">
          {m.memberNo} · {m.ageGroup}
        </span>
        <h1>{displayName(m)}</h1>
        <div>
          <StatusTag state={state} member={m} now={now} />
        </div>
      </header>
      <div className="s-grid s-grid-2">
        <MembershipPanel member={m} />
        <section className="panel stack">
          <h2>문진·기초 체력 (매니저 전용)</h2>
          <dl className="kv small">
            <dt>확인일</dt>
            <dd>{formatDate(m.questionnaire.updatedAt)}</dd>
            <dt>복용약·병력</dt>
            <dd>{m.questionnaire.conditions.join(', ') || '없음'}</dd>
            <dt>통증</dt>
            <dd>{m.questionnaire.pain}</dd>
            <dt>운동 경험</dt>
            <dd>{m.questionnaire.exerciseHistory}</dd>
            <dt>기초 체력</dt>
            <dd>{m.questionnaire.fitnessSummary}</dd>
          </dl>
          <p className="tiny muted">가상 문진 데이터 · 코치에게는 아래 주의사항만 보여요.</p>
          {m.dietCheck && (
            <p className="small">
              식사 확인 답변({formatDateTime(m.dietCheck.updatedAt)}): 식사 {DIET.regularity[m.dietCheck.regularity]} · 최근 식사량 {DIET.intakeChange[m.dietCheck.intakeChange]} · 단백질 식품 {DIET.proteinFoods[m.dietCheck.proteinFoods]}
            </p>
          )}
        </section>
      </div>
      <div className="s-grid s-grid-2">
        <PrecautionPanel member={m} />
        <PlanPanel member={m} />
      </div>
      <CareNotes member={m} />
      <div className="s-grid s-grid-2">
        <section className="panel stack">
          <h2>참여 이력</h2>
          <p className="small">{t.total === 2 && m.memberships.length === 0 ? `무료체험 ${t.used}/2 사용, ${t.reserved}회 예약` : '유료 회원권: 횟수 차감 없음'}</p>
          {history.length === 0 ? (
            <p className="small muted">예약 기록이 없어요.</p>
          ) : (
            <ul className="plain-list small">
              {history.slice(0, 12).map(({ b, s }) => (
                <li key={b.id}>
                  <Link to={`/staff/classes/${s.id}`}>
                    {formatDate(s.date)} {s.slot}
                  </Link>{' '}
                  · {{ booked: '예약', attended: '출석', absent: '결석', cancelled: '취소' }[b.status]}
                  {b.kind === 'trial' && ' (체험)'}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel stack">
          <h2>측정·문의</h2>
          <ul className="plain-list small">
            {ms.map((x) => (
              <li key={x.id}>
                <Link to={`/staff/measurements/${x.id}`}>{formatDate(seoulDate(new Date(x.measuredAt)))} 측정</Link> · {x.explanation.status === 'published' ? '설명 공개' : '설명 확인 전'}
              </li>
            ))}
            {ms.length === 0 && <li>측정 기록 없음</li>}
          </ul>
          <ul className="plain-list small">
            {inquiries.map((q) => (
              <li key={q.id}>
                [{INQUIRY_LABEL[q.category]}] {q.message} · {q.status === 'open' ? '답변 대기' : '답변 완료'}
              </li>
            ))}
          </ul>
          <Link to="/staff/inquiries">문의 목록으로</Link>
        </section>
      </div>
    </div>
  );
}

function MembershipPanel({ member: m }: { member: Member }) {
  const state = useAppState();
  const now = useNow();
  const { run, msg } = useRunner();
  const managerId = state.demo.managerId;
  const latestEnd = [...m.memberships].sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0]?.endDate;
  const defaultStart = latestEnd && latestEnd >= seoulDate(now) ? new Date(Date.parse(latestEnd) + 86400000).toISOString().slice(0, 10) : seoulDate(now);
  const [plan, setPlan] = useState<PlanType>('1m');
  const [start, setStart] = useState(defaultStart);
  const [ends, setEnds] = useState<Record<string, string>>({});
  return (
    <section className="panel stack">
      <h2>회원권</h2>
      {m.memberships.length === 0 && <p className="small">회원권이 없어요 (무료체험 회원).</p>}
      <ul className="stack-sm" style={{ listStyle: 'none' }}>
        {[...m.memberships].reverse().map((x) => (
          <li key={x.id} className="panel-soft stack-sm">
            <div className="row between">
              <strong>
                {PLAN_INFO[x.plan].label} · {x.price.toLocaleString('ko-KR')}원
              </strong>
              <span className={`tag ${x.status === 'paused' ? 'tag-warn' : 'tag-neutral'}`}>{x.status === 'paused' ? '휴회' : '정상'}</span>
            </div>
            <span className="small">
              {formatDate(x.startDate)} ~ {formatDate(x.endDate)}
            </span>
            <div className="row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => run((s, n) => setMembershipStatus(s, managerId, m.id, x.id, x.status === 'paused' ? 'active' : 'paused', n))}>
                {x.status === 'paused' ? '휴회 해제' : '휴회 처리'}
              </button>
              <label className="row small">
                <span>종료일</span>
                <input type="date" className="input" style={{ width: 'auto', minHeight: '2.75rem' }} value={ends[x.id] ?? x.endDate} onChange={(e) => setEnds((o) => ({ ...o, [x.id]: e.target.value }))} />
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => run((s, n) => changeEndDate(s, managerId, m.id, x.id, ends[x.id] ?? x.endDate, n))}>
                종료일 저장
              </button>
            </div>
          </li>
        ))}
      </ul>
      <fieldset className="stack-sm panel-soft">
        <legend className="strong">새 회원권 등록 (시연 가격)</legend>
        <div className="row">
          <select className="select" style={{ width: 'auto' }} value={plan} onChange={(e) => setPlan(e.target.value as PlanType)} aria-label="회원권 종류">
            <option value="1m">1개월 무제한 · 490,000원</option>
            <option value="3m">3개월 무제한 · 1,390,000원</option>
          </select>
          <input type="date" className="input" style={{ width: 'auto' }} value={start} onChange={(e) => setStart(e.target.value)} aria-label="시작일" />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => run((s, n) => addMembership(s, managerId, m.id, plan, start, n))}>
            등록
          </button>
        </div>
        <span className="tiny muted">실제 결제는 일어나지 않아요. 기존 기록은 지워지지 않고 이력이 남아요.</span>
      </fieldset>
      <Notice msg={msg} />
      {m.membershipLog.length > 0 && (
        <details className="fold">
          <summary>변경 이력 {m.membershipLog.length}건</summary>
          <ul className="fold-body plain-list small">
            {m.membershipLog.map((l) => (
              <li key={l.id}>
                {formatDateTime(l.at)} · {staffName(state, l.by)} · {l.action}: {l.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function PrecautionPanel({ member: m }: { member: Member }) {
  const state = useAppState();
  const [text, setText] = useState(m.precautions.join('\n'));
  const { run, msg } = useRunner();
  return (
    <section className="panel stack">
      <h2>코치에게 보이는 주의사항</h2>
      <div className="field">
        <label htmlFor="prec">한 줄에 하나씩 (최대 6줄)</label>
        <textarea id="prec" className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => run((s) => setPrecautions(s, state.demo.managerId, m.id, text.split('\n')))}>
        주의사항 저장
      </button>
      <Notice msg={msg} />
    </section>
  );
}

function PlanPanel({ member: m }: { member: Member }) {
  const state = useAppState();
  const [text, setText] = useState(m.exercisePlan?.text ?? '');
  const { run, msg } = useRunner();
  return (
    <section className="panel stack">
      <h2>이번 운동에서 할 일 (회원 공개)</h2>
      <div className="field">
        <label htmlFor="plan">문진·기초체력·통증·운동 경험을 함께 고려해 적어 주세요</label>
        <textarea id="plan" className="textarea" maxLength={400} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {m.exercisePlan && (
        <p className="tiny muted">
          마지막 작성: {staffName(state, m.exercisePlan.by)} · {formatDateTime(m.exercisePlan.updatedAt)}
        </p>
      )}
      <button type="button" className="btn btn-secondary" onClick={() => run((s, n) => setExercisePlan(s, state.demo.managerId, m.id, text, n))}>
        운동 방향 저장
      </button>
      <Notice msg={msg} />
    </section>
  );
}

function CareNotes({ member: m }: { member: Member }) {
  const state = useAppState();
  const [kind, setKind] = useState<'consult' | 'adjust'>('adjust');
  const [text, setText] = useState('');
  const { run, msg } = useRunner();
  return (
    <section className="panel stack">
      <h2>상담·운동 조정 기록</h2>
      <div className="row">
        <div className="chips" role="group" aria-label="기록 종류">
          <button type="button" className="chip" aria-pressed={kind === 'adjust'} onClick={() => setKind('adjust')}>
            운동 조정
          </button>
          <button type="button" className="chip" aria-pressed={kind === 'consult'} onClick={() => setKind('consult')}>
            상담
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="care">내용</label>
        <textarea id="care" className="textarea" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 밴드 강도 한 단계 낮춤, 세트 사이 90초 휴식" />
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          const r = run((s, n) => addCareNote(s, state.demo.managerId, m.id, kind, text, n));
          if (r.ok) setText('');
        }}
      >
        기록 추가
      </button>
      <Notice msg={msg} />
      <ul className="plain-list small">
        {m.careNotes.map((c) => (
          <li key={c.id}>
            {formatDateTime(c.at)} · {c.kind === 'adjust' ? '운동 조정' : '상담'} · {staffName(state, c.by)}: {c.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
