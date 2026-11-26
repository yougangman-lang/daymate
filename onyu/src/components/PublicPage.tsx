// 로그인·역할과 무관하게 볼 수 있는 공개 화면(시설 둘러보기, 무료체험 안내) 공통 요소
import { useEffect } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAppState, useStore } from '../store/store';
import { findMember } from '../domain/selectors';
import { updatePrefs } from '../services/member';
import { Icon } from './Icon';
import { stopSpeech } from './Speak';

export interface BackState {
  from?: string;
  fromState?: BackState;
}

/** 내부 경로만 허용 ('//' 같은 외부 주소 차단) */
function safeInternal(path: unknown): string | null {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : null;
}

/** 진입한 내부 화면으로 돌아간다. 직접 접속했으면 시작 화면으로. history(-1)은 쓰지 않는다. */
export function useBack() {
  const navigate = useNavigate();
  const location = useLocation() as Location<BackState | null>;
  const from = safeInternal(location.state?.from);
  return () => navigate(from ?? '/', { state: location.state?.fromState ?? null });
}

/** 화면 이동 시 읽어주기 중지·맨 위로, 회원 글씨 크기 설정 반영 */
export function usePublicPage() {
  const { pathname } = useLocation();
  const state = useAppState();
  const large = findMember(state, state.demo.memberId)?.prefs.fontScale === 'large';
  useEffect(() => {
    stopSpeech();
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.font = large ? 'large' : 'normal';
    return () => {
      document.documentElement.dataset.font = 'normal';
    };
  }, [large]);
}

export function FontToggle() {
  const state = useAppState();
  const store = useStore();
  const member = findMember(state, state.demo.memberId);
  if (!member) return null;
  const large = member.prefs.fontScale === 'large';
  return (
    <button type="button" className="btn btn-ghost" aria-pressed={large} onClick={() => store.run((s) => updatePrefs(s, member.id, { fontScale: large ? 'normal' : 'large' }))}>
      <Icon name="text" size={20} />
      {large ? '글씨 보통' : '글씨 크게'}
    </button>
  );
}
