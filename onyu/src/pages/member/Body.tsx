// 내 몸 알아보기: 자동 수신 측정값 / 매니저 설명 / 지도자 운동 방향 / 식사 확인 / 결과표 / 코치 피드백을 구분해 보여준다.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState, useNow, useStore } from '../../store/store';
import { findMember, memberFeedback, memberMeasurements, publicExplanation, staffName } from '../../domain/selectors';
import type { DietCheck, Feedback, Member } from '../../domain/types';
import { changeText, METRICS } from '../../domain/metrics';
import { getSession } from '../../domain/schedule';
import { formatDate, formatDateTime, seoulDate } from '../../lib/time';
import { respondFeedback } from '../../services/feedback';
import { createInquiry, markNotificationsRead, saveDietCheck } from '../../services/member';
import { SpeakControls } from '../../components/Speak';
import { DemoTag, Empty, Notice, PageHead, useRunner } from '../../components/ui';

export function BodyPage() {
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const member = findMember(state, state.demo.memberId)!;
  const list = memberMeasurements(state, member.id);
  const latest = list[0];
  const prev = list[1];
  const explanation = publicExplanation(latest);
  const lastPublished = list.find((m) => m.explanation.status === 'published');
  const rate = member.prefs.speechRate;

  // 이 화면에서 확인하는 알림은 읽음 처리
  useEffect(() => {
    const ids = store
      .get()
      .notifications.filter((n) => n.memberId === member.id && !n.read && ['feedback', 'feedback_followup', 'explanation', 'measurement'].includes(n.type))
      .map((n) => n.id);
    if (ids.length) store.run((s) => markNotificationsRead(s, member.id, ids));
  }, [member.id, store]);

  return (
    <div className="stack-lg">
      <PageHead title="내 몸 알아보기" desc="측정 기록, 온유 담당자의 쉬운 설명, 코치의 지도 내용을 나눠서 보여드려요." />
      <nav className="toc" aria-label="이 화면의 순서">
        <a href="#status">1. 내 몸의 상태</a>
        <a href="#explain">2. 쉽게 설명해드려요</a>
        <a href="#plan">3. 이번 운동에서 할 일</a>
        <a href="#diet">4. 식사도 살펴봐요</a>
        <a href="#detail">5. 자세한 결과</a>
        <a href="#feedback">6. 코치 피드백</a>
      </nav>

      <section id="status" className="panel stack" aria-labelledby="status-h">
        <div className="section-title">
          <h2 id="status-h">1. 내 몸의 상태</h2>
          <span className="tag tag-neutral">측정 기록 · 자동 수신</span>
        </div>
        {latest ? (
          <>
            <p className="small">
              최신 측정: <strong>{formatDateTime(latest.measuredAt)}</strong>
              {prev && <> · 비교 기준: {formatDate(seoulDate(new Date(prev.measuredAt)))} 측정</>} <DemoTag />
            </p>
            <ul className="metric-grid">
              {METRICS.filter((m) => m.core).map((m) => (
                <li key={m.key} className="metric">
                  <span className="label">{m.label}</span>
                  <span className="value num">
                    {latest.values[m.key]}
                    <small>{m.unit}</small>
                  </span>
                  <span className="change small">{prev ? `이전 대비 ${changeText(latest.values[m.key], prev.values[m.key], m.unit)}` : '비교할 이전 기록 없음'}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">측정값은 수분·식사·측정 시각에 따라 조금씩 달라질 수 있어요. 작은 변화만으로 좋아졌다거나 나빠졌다고 판단하지 않아요.</p>
          </>
        ) : (
          <Empty title="아직 측정 기록이 없어요">첫 방문 때 체성분 측정을 함께 진행해요.</Empty>
        )}
      </section>

      <section id="explain" className="panel stack" aria-labelledby="explain-h">
        <div className="section-title">
          <h2 id="explain-h">2. 쉽게 설명해드려요</h2>
          <span className="tag tag-ok">온유 담당자 확인 후 공개</span>
        </div>
        {latest && explanation ? (
          <>
            <p className="explain-text">{explanation}</p>
            <p className="small muted">
              온유 담당자 {staffName(state, latest.explanation.updatedBy)} 확인 · {latest.explanation.publishedAt && formatDateTime(latest.explanation.publishedAt)}
            </p>
            <SpeakControls text={explanation} label="쉬운 설명" rate={rate} />
          </>
        ) : latest ? (
          <>
            <Notice msg={{ kind: 'info', title: '온유 담당자가 결과를 확인하고 있어요', text: `${formatDate(seoulDate(new Date(latest.measuredAt)))} 측정 결과의 설명을 준비 중이에요. 공개되면 홈에서 알려드려요. 측정 기록은 위에서 먼저 보실 수 있어요.` }} />
            {lastPublished && (
              <div className="panel-soft stack-sm">
                <span className="small strong">이전 측정({formatDate(seoulDate(new Date(lastPublished.measuredAt)))}) 설명</span>
                <p>{lastPublished.explanation.text}</p>
              </div>
            )}
          </>
        ) : (
          <Empty title="설명할 측정 결과가 아직 없어요" />
        )}
      </section>

      <section id="plan" className="panel stack" aria-labelledby="plan-h">
        <div className="section-title">
          <h2 id="plan-h">3. 이번 운동에서 할 일</h2>
          <span className="tag tag-neutral">지도자 작성</span>
        </div>
        {member.exercisePlan ? (
          <>
            <p className="explain-text">{member.exercisePlan.text}</p>
            <p className="small muted">
              {staffName(state, member.exercisePlan.by)} 작성 · {formatDateTime(member.exercisePlan.updatedAt)} · 문진·기초체력·통증·운동 경험과 측정 결과를 함께 보고 정했어요.
            </p>
            <SpeakControls text={member.exercisePlan.text} label="이번 운동에서 할 일" rate={rate} />
          </>
        ) : (
          <Empty title="아직 작성된 운동 방향이 없어요">첫 상담과 기초 체력 확인 후 지도자가 작성해 드려요.</Empty>
        )}
      </section>

      <DietSection member={member} />

      <section id="detail" className="panel-flat stack-sm" aria-labelledby="detail-h">
        <h2 id="detail-h">5. 자세한 결과 보기</h2>
        <p className="small">측정 항목 전체와 지난 기록을 표로 확인하고 인쇄할 수 있어요. (시연용 결과표 – 공식 결과지 아님)</p>
        <Link className="btn btn-secondary" to="/member/body/report">
          자세한 결과표 열기
        </Link>
      </section>

      <section id="feedback" className="stack" aria-labelledby="fb-h">
        <div className="section-title">
          <h2 id="fb-h">6. 코치 피드백</h2>
          <span className="tag tag-neutral">출석한 수업별</span>
        </div>
        <FeedbackList member={member} now={now} />
      </section>
    </div>
  );
}

const DIET_Q: { key: keyof Omit<DietCheck, 'updatedAt'>; q: string; opts: { v: string; label: string }[] }[] = [
  { key: 'regularity', q: '식사를 규칙적으로 하시나요?', opts: [{ v: 'regular', label: '하루 세 끼 거의 규칙적' }, { v: 'sometimes', label: '가끔 거를 때가 있어요' }, { v: 'irregular', label: '불규칙한 편이에요' }] },
  { key: 'intakeChange', q: '최근 식사량이 달라졌나요?', opts: [{ v: 'same', label: '비슷해요' }, { v: 'less', label: '줄었어요' }, { v: 'more', label: '늘었어요' }] },
  { key: 'proteinFoods', q: '달걀·두부·생선·고기 같은 단백질 식품을 드시나요?', opts: [{ v: 'daily', label: '거의 매일' }, { v: 'sometimes', label: '일주일에 몇 번' }, { v: 'rarely', label: '거의 안 먹어요' }] },
];

function DietSection({ member }: { member: Member }) {
  const [ans, setAns] = useState<Partial<Omit<DietCheck, 'updatedAt'>>>(member.dietCheck ?? {});
  const { run, msg } = useRunner();
  const complete = DIET_Q.every((q) => ans[q.key]);
  return (
    <section id="diet" className="panel stack" aria-labelledby="diet-h">
      <div className="section-title">
        <h2 id="diet-h">4. 식사도 살펴봐요</h2>
        <span className="tag tag-neutral">직접 답하는 확인 질문</span>
      </div>
      <p className="small">체성분 측정값으로 식사 상태를 판단하지 않아요. 아래 질문에 답해 주시면 상담 때 함께 살펴봐요. 영양제나 특정 식품을 처방하지 않아요.</p>
      {DIET_Q.map((q) => (
        <fieldset key={q.key} className="stack-sm">
          <legend className="strong" style={{ marginBottom: 6 }}>
            {q.q}
          </legend>
          <div className="chips" role="radiogroup" aria-label={q.q}>
            {q.opts.map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={ans[q.key] === o.v} className="chip" onClick={() => setAns((a) => ({ ...a, [q.key]: o.v }))}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={!complete} onClick={() => complete && run((s, n) => saveDietCheck(s, member.id, ans as Omit<DietCheck, 'updatedAt'>, n))}>
          답변 저장하기
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => run((s, n) => createInquiry(s, member.id, 'diet', '식사에 대해 상담을 받고 싶어요. (내 몸 알아보기에서 요청)', n))}>
          식사 상담 요청하기
        </button>
      </div>
      {member.dietCheck && <p className="small muted">마지막 저장: {formatDateTime(member.dietCheck.updatedAt)}</p>}
      <Notice msg={msg} />
    </section>
  );
}

function FeedbackList({ member, now }: { member: Member; now: Date }) {
  const state = useAppState();
  const list = memberFeedback(state, member.id);
  const attended = state.bookings.filter((b) => b.memberId === member.id && b.status === 'attended').length;
  if (!list.length) {
    return (
      <Empty title="아직 공개된 코치 피드백이 없어요">
        {attended ? '출석한 수업의 피드백은 코치가 작성해 공개하면 여기에 보여요.' : '수업에 출석하면 코치가 그날의 지도 내용을 남겨 드려요.'}
      </Empty>
    );
  }
  void now;
  return (
    <ul className="stack" style={{ listStyle: 'none' }}>
      {list.map((f) => (
        <FeedbackCard key={f.id} f={f} memberId={member.id} rate={member.prefs.speechRate} />
      ))}
    </ul>
  );
}

function FeedbackCard({ f, memberId, rate }: { f: Feedback; memberId: string; rate: 'normal' | 'slow' }) {
  const state = useAppState();
  const { run, msg } = useRunner();
  const s = getSession(f.sessionId);
  const speak = `오늘 한 활동. ${f.activity}. 잘 수행한 점. ${f.didWell}. 다음에 조정할 점. ${f.nextAdjust}.`;
  return (
    <li className="panel stack feedback-card">
      <div className="row between">
        <strong>
          {s ? `${formatDate(s.date)} ${s.slot} · ${s.program.title}` : '수업'}
        </strong>
        <span className="small muted">코치 {staffName(state, f.coachId)}</span>
      </div>
      <dl className="fb-dl">
        <dt>오늘 한 활동</dt>
        <dd>{f.activity}</dd>
        <dt>잘 수행한 점</dt>
        <dd>{f.didWell}</dd>
        <dt>다음에 조정할 점</dt>
        <dd>{f.nextAdjust}</dd>
      </dl>
      <SpeakControls text={speak} label="코치 피드백" rate={rate} />
      <div className="stack-sm">
        <span className="small strong">설명이 이해되셨나요?</span>
        <div className="btn-row">
          <button type="button" className={`btn ${f.response === 'understood' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={f.response === 'understood'} onClick={() => run((st, n) => respondFeedback(st, memberId, f.id, 'understood', n))}>
            이해했어요
          </button>
          <button type="button" className={`btn ${f.response === 'need_more' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={f.response === 'need_more'} onClick={() => run((st, n) => respondFeedback(st, memberId, f.id, 'need_more', n))}>
            설명이 더 필요해요
          </button>
        </div>
        {f.response && !msg && <p className="small">선택한 응답: <strong>{f.response === 'understood' ? '이해했어요' : '설명이 더 필요해요 – 담당 코치와 온유 담당자에게 전달됨'}</strong></p>}
        <Notice msg={msg} />
      </div>
      {f.followUp && (
        <div className="panel-soft stack-sm">
          <span className="small strong">추가 설명 · {staffName(state, f.followUp.by)} · {formatDateTime(f.followUp.at)}</span>
          <p>{f.followUp.text}</p>
        </div>
      )}
    </li>
  );
}
