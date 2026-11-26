import type { AppState, Member } from '../../domain/types';
import { memberStatus, STATUS_LABEL } from '../../domain/selectors';
import { PLAN_INFO } from '../../domain/schedule';
import { formatDate } from '../../lib/time';

export function StatusTag({ state, member, now }: { state: AppState; member: Member; now: Date }) {
  const st = memberStatus(state, member, now);
  const cls = st.kind === 'paid' ? 'tag-ok' : st.kind === 'trial' || st.kind === 'upcoming' ? 'tag-neutral' : st.kind === 'paused' ? 'tag-warn' : 'tag-danger';
  return <span className={`tag ${cls}`}>{STATUS_LABEL[st.kind]}</span>;
}

export function MembershipLine({ state, member, now }: { state: AppState; member: Member; now: Date }) {
  const st = memberStatus(state, member, now);
  return (
    <div className="stack-sm">
      <div>
        <StatusTag state={state} member={member} now={now} />
      </div>
      {st.kind === 'paid' && (
        <p>
          {PLAN_INFO[st.membership.plan].label} · <strong>{formatDate(st.membership.endDate)}까지</strong> ({st.daysLeft}일 남음). 예약 횟수 제한이 없어요.
        </p>
      )}
      {st.kind === 'trial' && (
        <p>
          무료체험 2회 중 <strong>{st.used}회 사용</strong>
          {st.reserved > 0 && <>, {st.reserved}회 예약</>} · 남은 체험 {st.remaining}회. 유료 무제한 회원권과는 별도예요.
        </p>
      )}
      {st.kind === 'paused' && <p>휴회 기간이에요 ({formatDate(st.membership.startDate)} ~ {formatDate(st.membership.endDate)}). 휴회 중에는 예약과 회원 혜택을 이용할 수 없어요.</p>}
      {st.kind === 'upcoming' && <p>{formatDate(st.membership.startDate)}부터 회원권이 시작돼요.</p>}
      {st.kind === 'expired' && <p>{formatDate(st.membership.endDate)}에 회원권이 끝났어요. 연장은 매니저에게 도움을 요청해 주세요.</p>}
    </div>
  );
}
