import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppState, useNow, useStore } from '../store/store';
import { findMember, findStaff } from '../domain/selectors';
import { updatePrefs } from '../services/member';
import { BrandLogo } from './BrandLogo';
import { DemoBar } from './DemoBar';
import { Icon, type IconName } from './Icon';
import { stopSpeech } from './Speak';
import { useStaffCounts } from '../pages/staff/counts';

/** 화면 이동 시: 음성 중지, 맨 위로(또는 #앵커로) 스크롤 */
function useRouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    stopSpeech();
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

function DataNotice() {
  const store = useStore();
  useAppState();
  if (!store.notice || store.notice === 'fresh') return null;
  return (
    <div className="notice notice-warn no-print" role="status" style={{ borderRadius: 0 }}>
      <Icon name="alert" />
      <div className="row between">
        <span>
          {store.notice === 'corrupt'
            ? '저장된 시연 데이터를 읽을 수 없어 처음 상태로 복구했어요. (이전 값은 브라우저에 백업해 두었어요)'
            : '시연 데이터 형식이 바뀌어 처음 상태로 다시 만들었어요.'}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => store.dismissNotice()}>
          닫기
        </button>
      </div>
    </div>
  );
}

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/member', label: '홈', icon: 'home', end: true },
  { to: '/member/book', label: '수업 예약', icon: 'calendar' },
  { to: '/member/body', label: '내 몸 알아보기', icon: 'body' },
  { to: '/member/mall', label: '온유 제휴몰', icon: 'bag' },
  { to: '/member/me', label: '내 정보', icon: 'user' },
];

export function MemberLayout() {
  useRouteEffects();
  const state = useAppState();
  const store = useStore();
  const member = findMember(state, state.demo.memberId)!;
  const large = member.prefs.fontScale === 'large';

  useEffect(() => {
    document.documentElement.dataset.font = large ? 'large' : 'normal';
    return () => {
      document.documentElement.dataset.font = 'normal';
    };
  }, [large]);

  return (
    <div className="m-shell">
      <a className="skip-link" href="#main">
        본문으로 바로가기
      </a>
      <DemoBar />
      <DataNotice />
      <header className="m-header no-print">
        <div className="m-header-inner">
          <BrandLogo to="/member" size="sm" label="온유 회원 홈으로" />
          <div className="m-header-actions">
            <button
              type="button"
              className="btn btn-ghost"
              aria-pressed={large}
              onClick={() => store.run((s) => updatePrefs(s, member.id, { fontScale: large ? 'normal' : 'large' }))}
            >
              <Icon name="text" size={20} />
              {large ? '글씨 보통' : '글씨 크게'}
            </button>
            <Link className="btn btn-secondary" to="/member/me/help">
              <Icon name="help" size={20} /> 도움 요청
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="m-main" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="tabbar no-print" aria-label="회원 메뉴">
        <ul>
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end}>
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function StaffNav() {
  const state = useAppState();
  const counts = useStaffCounts();
  const isManager = state.demo.staffKind === 'manager';
  const items: { to: string; label: string; icon: IconName; end?: boolean; count?: number }[] = isManager
    ? [
        { to: '/staff', label: '오늘의 운영', icon: 'home', end: true },
        { to: '/staff/classes', label: '수업 관리', icon: 'calendar' },
        { to: '/staff/members', label: '회원 관리', icon: 'users' },
        { to: '/staff/measurements', label: '측정·설명 관리', icon: 'chart', count: counts.pendingMeasurements },
        { to: '/staff/feedback', label: '피드백 확인', icon: 'clipboard', count: counts.needMore },
        { to: '/staff/mall', label: '제휴몰 관리', icon: 'gift' },
        { to: '/staff/inquiries', label: '문의·알림', icon: 'message', count: counts.openInquiries },
        { to: '/staff/demo', label: '시연 설정', icon: 'gear' },
      ]
    : [
        { to: '/staff', label: '담당 수업', icon: 'calendar', end: true },
        { to: '/staff/feedback', label: '피드백 작성·확인', icon: 'clipboard', count: counts.coachTodo },
      ];
  return (
    <nav aria-label="운영진 메뉴">
      <ul className="s-nav" style={{ listStyle: 'none' }}>
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} end={i.end}>
              <Icon name={i.icon} />
              <span>{i.label}</span>
              {!!i.count && (
                <span className="count" aria-label={`${i.count}건`}>
                  {i.count}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function StaffLayout() {
  useRouteEffects();
  const state = useAppState();
  const now = useNow();
  const isManager = state.demo.staffKind === 'manager';
  const me = findStaff(state, isManager ? state.demo.managerId : state.demo.coachId);
  const roleLine = `${isManager ? '매니저' : '코치'} ${me?.name ?? ''}${isManager ? '' : '(가상)'}`;
  const offset = state.demo.clockOffsetMs !== 0;
  return (
    <div>
      <a className="skip-link" href="#main">
        본문으로 바로가기
      </a>
      <DemoBar />
      <DataNotice />
      <div className="s-shell">
        <aside className="s-side">
          <BrandLogo to="/staff" size="md" label="운영진 홈으로" />
          <div className="s-role">
            운영진 화면 · {roleLine}
            {offset && (
              <div className="tag tag-warn" style={{ marginTop: 6 }}>
                시연 기준 시각 적용 중
              </div>
            )}
          </div>
          <StaffNav />
        </aside>
        <div className="s-top">
          <div className="s-top-row">
            <BrandLogo to="/staff" size="sm" label="운영진 홈으로" />
            <span className="s-role">{roleLine}</span>
          </div>
          <StaffNav />
        </div>
        <main id="main" className="s-main" tabIndex={-1} data-now={now.toISOString()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ManagerOnly({ children }: { children: ReactNode }) {
  const state = useAppState();
  if (state.demo.staffKind !== 'manager') {
    return (
      <div className="panel stack">
        <h1>매니저 전용 메뉴예요</h1>
        <p>코치 화면에서는 회원권·제휴몰·전체 건강 문진 관리를 제공하지 않아요. 담당 수업 화면을 이용해 주세요.</p>
        <Link className="btn btn-primary" to="/staff">
          담당 수업으로
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
