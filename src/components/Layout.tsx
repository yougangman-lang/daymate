import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ME } from '../lib/types';
import { useStore } from '../store';
import { Modal } from './Modal';
import { Icon } from './ui';

const NAV = [
  { to: '/', label: '홈', icon: 'home' as const, end: true },
  { to: '/explore', label: '둘러보기', icon: 'search' as const },
  { to: '/host', label: '역매칭', icon: 'spark' as const },
  { to: '/me', label: '내 동행', icon: 'users' as const },
  { to: '/safety', label: '안전', icon: 'shield' as const },
];

export function Logo() {
  return (
    <span className="logo" aria-label="DAYMATE">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle cx="12" cy="16" r="9" fill="var(--brand)" />
        <circle cx="20" cy="16" r="9" fill="var(--lime)" style={{ mixBlendMode: 'multiply' }} />
      </svg>
      <span aria-hidden="true">DAYMATE</span>
    </span>
  );
}

export function Layout() {
  const { state, toasts, storageOk, reset, toast } = useStore();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const [resetOpen, setResetOpen] = useState(false);
  const pendingForMe = state.invitations.filter((i) => i.participantId === ME && i.status === 'pending').length;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        본문으로 건너뛰기
      </a>
      <div className="proto-banner" role="note">
        시제품 · 예시 그룹·참여자는 모두 허구이며, 입력한 내용은 이 브라우저에만 저장되고 다른 사람에게 전송되지 않아요.
      </div>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo-link">
            <Logo />
          </Link>
          <nav className="topnav" aria-label="주요 메뉴">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="topnav-link">
                {n.label}
                {n.to === '/me' && pendingForMe > 0 && <span className="dot-badge" aria-label={`받은 초대 ${pendingForMe}개`}>{pendingForMe}</span>}
              </NavLink>
            ))}
          </nav>
          <Link to="/start" className="btn btn-primary btn-sm topbar-cta">
            {state.test.result ? '조건 수정' : '취향 확인'}
          </Link>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <Logo />
          <p>대학생·청년을 위한 일상 여가 동행 서비스 · 시제품</p>
          <p className="footer-small">
            예시 그룹·참여자·학교·일정은 모두 허구이며 실제 경기·전시·공연 일정이나 예약 가능 여부와 무관해요. 특정 구단·브랜드의
            공식 서비스가 아니에요.
          </p>
          <nav className="footer-links" aria-label="보조 메뉴">
            <Link to="/invites">받은 초대</Link>
            <Link to="/create">새 그룹 만들기</Link>
            <Link to="/records">신고·차단 기록</Link>
            <Link to="/safety">대학생 인증·안전 안내</Link>
            <button type="button" className="linklike" onClick={() => setResetOpen(true)}>
              시제품 데이터 초기화
            </button>
          </nav>
          {!storageOk && <p className="form-error">브라우저 저장소를 사용할 수 없어 새로고침하면 입력 내용이 사라져요.</p>}
        </div>
      </footer>

      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="tab">
            <span className="tab-icon">
              <Icon name={n.icon} size={22} />
              {n.to === '/me' && pendingForMe > 0 && <span className="dot-badge small" aria-hidden="true">{pendingForMe}</span>}
            </span>
            <span>{n.label}</span>
            {n.to === '/me' && pendingForMe > 0 && <span className="sr-only">받은 초대 {pendingForMe}개</span>}
          </NavLink>
        ))}
      </nav>

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'toast-error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>

      <Modal
        open={resetOpen}
        title="시제품 데이터 초기화"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                reset();
                setResetOpen(false);
                toast('이 브라우저에 저장된 시제품 데이터를 모두 지웠어요.');
              }}
            >
              모두 지우기
            </button>
          </>
        }
      >
        <p>테스트 결과, 선택 조건, 저장·생성한 그룹, 참여 요청, 초대, 신고·차단 기록을 이 브라우저에서 모두 지워요.</p>
      </Modal>
    </div>
  );
}
