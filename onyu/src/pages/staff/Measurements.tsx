import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState } from '../../store/store';
import type { ExplanationStatus } from '../../domain/types';
import { displayName, findMember, memberMeasurements, staffName } from '../../domain/selectors';
import { changeText, METRICS } from '../../domain/metrics';
import { formatDate, formatDateTime, seoulDate } from '../../lib/time';
import { demoInBodySource } from '../../adapters/inbody';
import { resendLast, saveExplanation, simulateReceive } from '../../services/measurement';
import { DemoTag, Empty, Notice, PageNav, useRunner } from '../../components/ui';

const STATUS: Record<ExplanationStatus, { label: string; cls: string }> = {
  pending: { label: '설명 확인 전', cls: 'tag-danger' },
  draft: { label: '초안 (비공개)', cls: 'tag-warn' },
  published: { label: '회원에게 공개', cls: 'tag-ok' },
};

export function MeasurementsPage() {
  const state = useAppState();
  const [memberId, setMemberId] = useState(state.demo.memberId);
  const [filter, setFilter] = useState<'all' | ExplanationStatus>('all');
  const { run, msg } = useRunner();
  const list = [...state.measurements].filter((m) => filter === 'all' || m.explanation.status === filter).sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">측정·설명 관리</span>
        <h1>측정 결과와 쉬운 설명</h1>
        <p>측정값은 수신 즉시 회원에게 원본으로 보이고, 쉬운 설명은 매니저가 검토해 공개해야 보여요.</p>
      </header>

      <section className="panel stack" aria-labelledby="recv-h">
        <div className="section-title">
          <h2 id="recv-h">인바디 수신 시연</h2>
          <DemoTag>시연 수신기 · 실제 기기 연동 아님</DemoTag>
        </div>
        <div className="field">
          <label htmlFor="recv-member">결과를 받을 가상 회원</label>
          <select id="recv-member" className="select" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)} ({m.memberNo})
              </option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => run((s, n) => simulateReceive(s, demoInBodySource, memberId, n), '수신 완료')}>
            새 측정 결과 수신 시연
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => run((s, n) => resendLast(s, n))} disabled={!state.demo.lastDemoEventId}>
            같은 결과 다시 보내기 (중복 수신 확인)
          </button>
        </div>
        <Notice msg={msg} />
        <details className="fold">
          <summary>실제 연동 순서와 남은 확인 사항</summary>
          <div className="fold-body stack-sm small">
            <ol style={{ paddingLeft: '1.3rem' }}>
              <li>회원의 측정 결과 수집·이용 동의</li>
              <li>기기에서 측정</li>
              <li>온유 서버가 InBody Connect/API 또는 LookinBody Web API로 결과 수신 (API 키는 서버에서만 보관)</li>
              <li>회원 식별 확인 (회원 ID 일치 확인, 불일치 시 저장하지 않음)</li>
              <li>원본 결과 반영 (외부 결과 ID 기준 중복 저장 방지)</li>
              <li>매니저가 설명을 검토·수정해 공개</li>
            </ol>
            <p>지원 장비, API 계약, 접근 키, 비용은 확인이 필요한 항목이며 현재 체결된 협업은 없어요.</p>
          </div>
        </details>
      </section>

      <section className="stack" aria-labelledby="list-h">
        <h2 id="list-h">수신 기록</h2>
        <div className="chips" role="group" aria-label="설명 상태">
          {(['all', 'pending', 'draft', 'published'] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? '전체' : STATUS[f].label}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty title="조건에 맞는 측정 기록이 없어요" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>측정 시각</th>
                  <th>상태</th>
                  <th>기록 ID</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/staff/measurements/${m.id}`}>{displayName(findMember(state, m.memberId))}</Link>
                    </td>
                    <td className="small">{formatDateTime(m.measuredAt)}</td>
                    <td>
                      <span className={`tag ${STATUS[m.explanation.status].cls}`}>{STATUS[m.explanation.status].label}</span>
                    </td>
                    <td className="tiny">
                      {m.id}
                      <div className="muted">{m.externalId}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function MeasurementDetail() {
  const { measurementId = '' } = useParams();
  const state = useAppState();
  const m = state.measurements.find((x) => x.id === measurementId);
  const [text, setText] = useState(m?.explanation.text ?? '');
  const [coachNote, setCoachNote] = useState(m?.explanation.coachNote ?? '');
  const { run, msg } = useRunner();
  if (!m) return <Empty title="측정 기록을 찾을 수 없어요" />;
  const member = findMember(state, m.memberId)!;
  const all = memberMeasurements(state, m.memberId);
  const prev = all[all.findIndex((x) => x.id === m.id) + 1];
  const managerId = state.demo.managerId;
  return (
    <div className="stack-lg">
      <PageNav back="/staff/measurements" home="/staff" />
      <header className="page-head">
        <span className="eyebrow">
          {displayName(member)} · {formatDateTime(m.measuredAt)}
        </span>
        <h1>측정 결과 설명 검토</h1>
        <div className="row">
          <span className={`tag ${STATUS[m.explanation.status].cls}`}>{STATUS[m.explanation.status].label}</span>
          <span className="small muted">
            기록 ID {m.id} · 외부 ID {m.externalId} · 출처 {m.source === 'demo' ? '시연' : '인바디'}
          </span>
        </div>
      </header>
      <div className="s-grid s-grid-2">
        <section className="panel stack">
          <h2>측정값 (원본)</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>항목</th>
                  <th className="num">이번</th>
                  <th>{prev ? `${formatDate(seoulDate(new Date(prev.measuredAt)))} 대비` : '이전'}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((d) => (
                  <tr key={d.key}>
                    <th scope="row">
                      {d.label} ({d.unit})
                    </th>
                    <td className="num">{m.values[d.key]}</td>
                    <td className="small">{changeText(m.values[d.key], prev?.values[d.key], d.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">기초 체력: {member.questionnaire.fitnessSummary}</p>
        </section>
        <section className="panel stack">
          <h2>회원에게 보일 쉬운 설명</h2>
          <ul className="plain-list tiny muted">
            <li>측정값만으로 질병·근감소증·영양소 부족을 단정하지 않아요.</li>
            <li>체성분 단백질은 식사로 먹은 단백질 양이 아니에요.</li>
            <li>작은 변화는 수분 등으로 달라질 수 있어요. 개선·악화로 단정하지 않아요.</li>
            <li>상품 추천을 넣지 않아요. 초안은 미리 작성된 문구로 만들어졌어요.</li>
          </ul>
          <div className="field">
            <label htmlFor="exp-text">설명 (2~3문장 권장, 500자까지)</label>
            <textarea id="exp-text" className="textarea" rows={6} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="coach-note">코치에게 전달할 지도 사항 (회원에게는 보이지 않음)</label>
            <textarea id="coach-note" className="textarea" maxLength={300} value={coachNote} onChange={(e) => setCoachNote(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => run((s, n) => saveExplanation(s, managerId, m.id, { text, coachNote }, false, n))}>
              {m.explanation.status === 'published' ? '공개 취소하고 초안으로' : '초안 저장'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => run((s, n) => saveExplanation(s, managerId, m.id, { text, coachNote }, true, n), '공개 완료')}>
              {m.explanation.status === 'published' ? '수정 내용 공개' : '검토 완료 · 회원에게 공개'}
            </button>
          </div>
          <Notice msg={msg} />
          {m.explanation.updatedBy && (
            <p className="tiny muted">
              마지막 처리: {staffName(state, m.explanation.updatedBy)} · {m.explanation.updatedAt && formatDateTime(m.explanation.updatedAt)}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
