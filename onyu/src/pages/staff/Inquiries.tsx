import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../store/store';
import type { Inquiry } from '../../domain/types';
import { displayName, findMember, staffName } from '../../domain/selectors';
import { formatDateTime } from '../../lib/time';
import { answerInquiry, INQUIRY_LABEL } from '../../services/member';
import { Empty, Notice, useRunner } from '../../components/ui';

export function InquiriesPage() {
  const state = useAppState();
  const [filter, setFilter] = useState<'open' | 'answered' | 'all'>('open');
  const list = state.inquiries.filter((q) => filter === 'all' || q.status === filter);
  const recent = state.notifications.slice(0, 6);
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">문의·알림</span>
        <h1>회원 도움 요청</h1>
        <p>회원 화면의 [도움 요청]과 식사 상담 요청이 여기에 모여요. 답변하면 회원 화면에 바로 표시돼요.</p>
      </header>
      <div className="chips" role="group" aria-label="처리 상태">
        {(['open', 'answered', 'all'] as const).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'open' ? '답변 대기' : f === 'answered' ? '답변 완료' : '전체'} ({state.inquiries.filter((q) => f === 'all' || q.status === f).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Empty title="해당하는 문의가 없어요" />
      ) : (
        <ul className="stack" style={{ listStyle: 'none' }}>
          {list.map((q) => (
            <InquiryItem key={q.id} q={q} />
          ))}
        </ul>
      )}
      <section className="stack-sm" aria-labelledby="noti-h">
        <h2 id="noti-h">최근 회원 앱 알림 (앱 안 알림만)</h2>
        <ul className="plain-list small">
          {recent.map((n) => (
            <li key={n.id}>
              {formatDateTime(n.createdAt)} · {displayName(findMember(state, n.memberId))} · {n.title} · {n.read ? '읽음' : '안 읽음'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function InquiryItem({ q }: { q: Inquiry }) {
  const state = useAppState();
  const [text, setText] = useState('');
  const { run, msg } = useRunner();
  return (
    <li className="panel stack-sm">
      <div className="row between">
        <strong>
          [{INQUIRY_LABEL[q.category]}] <Link to={`/staff/members/${q.memberId}`}>{displayName(findMember(state, q.memberId))}</Link>
        </strong>
        <span className={`tag ${q.status === 'open' ? 'tag-warn' : 'tag-ok'}`}>{q.status === 'open' ? '답변 대기' : '답변 완료'}</span>
      </div>
      <p>{q.message}</p>
      <span className="tiny muted">{formatDateTime(q.createdAt)}</span>
      {q.status === 'answered' ? (
        <p className="small panel-soft">
          {staffName(state, q.answeredBy)} 답변: {q.answer}
        </p>
      ) : (
        <div className="stack-sm">
          <label htmlFor={`ans-${q.id}`} className="small strong">
            답변
          </label>
          <textarea id={`ans-${q.id}`} className="textarea" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => run((s, n) => answerInquiry(s, state.demo.managerId, q.id, text, n))}>
            답변 보내기
          </button>
        </div>
      )}
      <Notice msg={msg} />
    </li>
  );
}
