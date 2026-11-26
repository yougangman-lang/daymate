// 시연용 역할 전환 장치. 실제 로그인·권한 보안이 아니다.
import { useNavigate } from 'react-router-dom';
import { useAppState, useStore } from '../store/store';
import { setDemo } from '../services/demo';
import { displayName } from '../domain/selectors';
import type { StaffKind, ViewRole } from '../domain/types';

export function DemoBar() {
  const state = useAppState();
  const store = useStore();
  const navigate = useNavigate();
  const { demo } = state;

  const switchView = (view: ViewRole) => {
    store.run((s) => setDemo(s, { view }));
    navigate(view === 'member' ? '/member' : '/staff');
  };
  const switchKind = (staffKind: StaffKind) => {
    store.run((s) => setDemo(s, { staffKind, view: 'staff' }));
    navigate('/staff');
  };
  const managers = state.staff.filter((s) => s.kind === 'manager');
  const coaches = state.staff.filter((s) => s.kind === 'coach');

  return (
    <div className="demo-bar no-print" role="region" aria-label="시연 장치">
      <span className="demo-label">
        시연 장치 <small>역할 전환 · 실제 로그인 아님</small>
      </span>
      <div className="seg" role="group" aria-label="화면 선택">
        <button type="button" aria-pressed={demo.view === 'member'} onClick={() => switchView('member')}>
          회원 화면
        </button>
        <button type="button" aria-pressed={demo.view === 'staff'} onClick={() => switchView('staff')}>
          매니저 화면
        </button>
      </div>
      {demo.view === 'member' ? (
        <label className="demo-group">
          <span>가상 회원</span>
          <select value={demo.memberId} onChange={(e) => store.run((s) => setDemo(s, { memberId: e.target.value }))}>
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="demo-group">
          <div className="seg" role="group" aria-label="운영진 역할">
            <button type="button" aria-pressed={demo.staffKind === 'manager'} onClick={() => switchKind('manager')}>
              매니저
            </button>
            <button type="button" aria-pressed={demo.staffKind === 'coach'} onClick={() => switchKind('coach')}>
              코치
            </button>
          </div>
          <label className="demo-group">
            <span className="sr-only">운영진 선택</span>
            {demo.staffKind === 'manager' ? (
              <select value={demo.managerId} onChange={(e) => store.run((s) => setDemo(s, { managerId: e.target.value }))}>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    매니저 {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <select value={demo.coachId} onChange={(e) => store.run((s) => setDemo(s, { coachId: e.target.value }))}>
                {coaches.map((m) => (
                  <option key={m.id} value={m.id}>
                    코치 {m.name}(가상)
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
