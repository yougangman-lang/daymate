import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/store';
import type { Feedback } from '../../domain/types';
import { displayName, findMember, staffName } from '../../domain/selectors';
import { getSession } from '../../domain/schedule';
import { formatDate, formatDateTime } from '../../lib/time';
import { followUpFeedback } from '../../services/feedback';
import { Empty, Notice, useRunner } from '../../components/ui';

const FILTERS = {
  all: '전체',
  draft: '초안',
  published: '공개',
  need_more: '설명 더 필요',
  understood: '이해했어요',
  none: '미응답',
} as const;
type F = keyof typeof FILTERS;

function match(f: Feedback, k: F) {
  if (k === 'all') return true;
  if (k === 'draft' || k === 'published') return f.status === k;
  if (k === 'none') return f.status === 'published' && !f.response;
  return f.response === k;
}

export function FeedbackPage() {
  const state = useAppState();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as F) in FILTERS ? (params.get('filter') as F) : 'all';
  const isManager = state.demo.staffKind === 'manager';
  const coachId = state.demo.coachId;
  const scoped = state.feedback.filter((f) => isManager || getSession(f.sessionId)?.coachIds.includes(coachId as never));
  const list = scoped.filter((f) => match(f, filter)).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">{isManager ? '피드백 확인' : '피드백 작성·확인'}</span>
        <h1>코치 피드백과 회원 응답</h1>
        <p>{isManager ? '코치가 작성한 피드백과 회원의 이해 응답을 확인해요. 초안은 회원에게 보이지 않아요.' : '내 담당 수업의 피드백이에요. 작성·수정은 수업 명단에서 해요.'}</p>
      </header>
      <div className="chips" role="group" aria-label="피드백 상태">
        {(Object.keys(FILTERS) as F[]).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setParams(k === 'all' ? {} : { filter: k })}>
            {FILTERS[k]} ({scoped.filter((f) => match(f, k)).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="조건에 맞는 피드백이 없어요" />
      ) : (
        <ul className="stack" style={{ listStyle: 'none' }}>
          {list.map((f) => (
            <FeedbackItem key={f.id} f={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackItem({ f }: { f: Feedback }) {
  const state = useAppState();
  const s = getSession(f.sessionId)!;
  const [text, setText] = useState('');
  const { run, msg } = useRunner();
  const staffId = state.demo.staffKind === 'manager' ? state.demo.managerId : state.demo.coachId;
  return (
    <li className="panel stack-sm">
      <div className="row between">
        <strong>
          {displayName(findMember(state, f.memberId))} · {formatDate(s.date)} {s.slot} {s.program.title}
        </strong>
        <div className="row">
          <span className={`tag ${f.status === 'published' ? 'tag-ok' : 'tag-neutral'}`}>{f.status === 'published' ? '공개됨' : '초안'}</span>
          {f.status === 'published' && (
            <span className={`tag ${f.response === 'need_more' ? 'tag-danger' : f.response === 'understood' ? 'tag-ok' : 'tag-neutral'}`}>
              {f.response === 'need_more' ? '설명이 더 필요해요' : f.response === 'understood' ? '이해했어요' : '미응답'}
            </span>
          )}
        </div>
      </div>
      <span className="small muted">
        코치 {staffName(state, f.coachId)} · 수정 {formatDateTime(f.updatedAt)}
      </span>
      <dl className="fb-dl small">
        <dt>오늘 한 활동</dt>
        <dd>{f.activity || '-'}</dd>
        <dt>잘 수행한 점</dt>
        <dd>{f.didWell || '-'}</dd>
        <dt>다음에 조정할 점</dt>
        <dd>{f.nextAdjust || '-'}</dd>
      </dl>
      {f.followUp && (
        <p className="small">
          추가 설명({staffName(state, f.followUp.by)}): {f.followUp.text}
        </p>
      )}
      {f.response === 'need_more' && !f.followUp && (
        <div className="stack-sm">
          <label className="small strong" htmlFor={`fu-${f.id}`}>
            추가 설명 남기기
          </label>
          <textarea id={`fu-${f.id}`} className="textarea" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => run((st, n) => followUpFeedback(st, staffId, f.id, text, n))}>
            추가 설명 보내기
          </button>
        </div>
      )}
      <Notice msg={msg} />
      <Link className="small" to={`/staff/classes/${s.id}#bk-${f.bookingId}`}>
        수업 명단에서 보기
      </Link>
    </li>
  );
}
