import { NavLink } from 'react-router-dom';

/** 시연용 화면 전환: 호스트 ↔ 참여자 */
export function ModeSwitch() {
  return (
    <nav className="mode-switch" aria-label="시연 화면 전환">
      <NavLink to="/host" className="mode-tab">
        호스트 화면
      </NavLink>
      <NavLink to="/invites" className="mode-tab">
        참여자 화면 · 받은 초대
      </NavLink>
    </nav>
  );
}
