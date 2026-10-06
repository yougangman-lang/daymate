import { useId } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModeSwitch } from '../components/ModeSwitch';
import { Avatar, DemoNote, EmptyState, PageHeader, ScorePill } from '../components/ui';
import { respondInvite } from '../lib/actions';
import { proximity, remainingSeats } from '../lib/matching';
import { ME } from '../lib/types';
import { useStore } from '../store';
import { GroupSummary, INVITE_STATUS } from './Host';

export function Invites() {
  const { state, update, groups, personById, toast } = useStore();
  const [params, setParams] = useSearchParams();
  const viewerId = useId();

  // 시연용: 초대를 받은 예시 참여자 + 나
  const viewers = Array.from(new Set([ME, ...state.invitations.map((i) => i.participantId)]));
  const asParam = params.get('as');
  const viewer = asParam && viewers.includes(asParam) ? asParam : ME;
  const viewerPerson = personById(viewer);
  const list = state.invitations
    .filter((i) => i.participantId === viewer)
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.createdAt.localeCompare(a.createdAt));

  const respond = (id: string, answer: 'accept' | 'decline') => {
    const r = respondInvite(state, groups, id, answer);
    if (!r.ok) {
      toast(r.error, 'error');
      return;
    }
    update(() => r.state);
    toast(answer === 'accept' ? '초대를 수락했어요. 참여가 확정됐어요.' : '초대를 거절했어요.');
  };

  return (
    <div className="page narrow">
      <ModeSwitch />
      <PageHeader eyebrow="참여자 화면" title="받은 초대" desc="초대받은 그룹의 조건을 확인하고 수락하면 참여가 확정돼요." />
      <DemoNote>
        같은 브라우저에서 호스트가 보낸 초대를 참여자 입장에서 확인하는 시연 화면이에요. 예시 참여자를 선택하면 그 사람의 화면을
        대신 볼 수 있어요.
      </DemoNote>

      <div className="field">
        <label htmlFor={viewerId}>누구의 화면으로 볼까요?</label>
        <select id={viewerId} value={viewer} onChange={(e) => setParams(e.target.value === ME ? {} : { as: e.target.value }, { replace: true })}>
          {viewers.map((v) => (
            <option key={v} value={v}>
              {v === ME ? '나' : `${personById(v)?.nickname ?? v} (예시 참여자)`}
            </option>
          ))}
        </select>
      </div>

      {viewer === ME && !state.reverseOptIn && (
        <p className="notice" role="note">
          역매칭 공개에 동의하지 않아 나는 호스트의 후보 목록에 나타나지 않아요. <Link to="/result">결과 화면</Link>에서 동의할 수 있어요.
        </p>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="받은 초대가 없어요"
          action={<Link to="/host" className="btn btn-primary">호스트 화면에서 초대 보내 보기</Link>}
        >
          <p>호스트 화면에서 예시 참여자에게 초대를 보낸 뒤, 이 화면에서 그 참여자를 선택해 수락·거절을 시연해 보세요.</p>
        </EmptyState>
      ) : (
        <ul className="invite-cards">
          {list.map((inv) => {
            const group = groups.find((g) => g.id === inv.groupId);
            const host = personById(inv.hostId);
            if (!group) return null;
            const left = remainingSeats(group);
            const score = viewerPerson && (viewer !== ME || state.test.result) ? proximity(viewerPerson.traits, group.prefs) : null;
            return (
              <li key={inv.id} className="invite-card">
                <div className="ic-head">
                  {host && <Avatar person={host} size={40} />}
                  <div>
                    <p className="muted">{host?.nickname ?? '호스트'}님의 초대</p>
                    <h2 className="ic-title">
                      <Link to={`/groups/${group.id}`}>{group.title}</Link>
                    </h2>
                  </div>
                  <span className={`status status-${inv.status}`}>{INVITE_STATUS[inv.status]}</span>
                </div>
                {score !== null && <ScorePill score={score} />}
                <blockquote className="ic-msg">{inv.message}</blockquote>
                <GroupSummary group={group} />
                {inv.status === 'pending' && (
                  <>
                    {left === 0 && (
                      <p className="notice notice-warn" role="note">
                        정원이 모두 차서 지금은 수락할 수 없어요.
                      </p>
                    )}
                    <div className="row-actions">
                      <button type="button" className="btn btn-primary" disabled={left === 0} onClick={() => respond(inv.id, 'accept')}>
                        수락하기
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => respond(inv.id, 'decline')}>
                        거절하기
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
