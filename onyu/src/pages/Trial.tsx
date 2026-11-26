// 무료체험 안내 (공개 경로 /trial). 비회원도 볼 수 있고, 체험 예약은 기존 수업 예약 흐름으로 이어진다.
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';
import { FontToggle, useBack, usePublicPage, type BackState } from '../components/PublicPage';
import { Notice } from '../components/ui';
import { useAppState, useNow, useStore } from '../store/store';
import { displayName, memberStatus } from '../domain/selectors';
import { BOOKING_WINDOW_DAYS, PHASES, PLAN_INFO, TRIAL_TOTAL } from '../domain/schedule';
import { setDemo } from '../services/demo';

export function TrialPage() {
  usePublicPage();
  const back = useBack();
  const navigate = useNavigate();
  const location = useLocation() as Location<BackState | null>;
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  // 시연: 아직 체험이 남은 가상 신규 회원으로 예약 흐름을 보여준다
  const trialMember = state.members.find((m) => {
    const st = memberStatus(state, m, now);
    return st.kind === 'trial' && st.remaining > 0;
  });

  const startBooking = () => {
    if (!trialMember) return;
    const r = store.run((s) => setDemo(s, { view: 'member', memberId: trialMember.id }));
    if (r.ok) navigate('/member/book');
  };

  return (
    <main className="onyu-ft" id="main" aria-labelledby="trial-title">
      <header className="onyu-ft-heading">
        <div className="onyu-ft-topbar">
          <button type="button" className="btn btn-ghost" onClick={back}>
            <Icon name="back" size={20} /> 이전으로
          </button>
          <FontToggle />
        </div>
        <BrandLogo to="/" size="md" label="온유 시작 화면으로" />
        <h1 id="trial-title">무료체험 안내</h1>
        <p>처음 오시는 분은 수업을 {TRIAL_TOTAL}회 무료로 체험할 수 있어요.</p>
      </header>

      <div className="stack-lg" style={{ marginTop: 24 }}>
        <section className="panel stack">
          <h2>체험은 이렇게 진행돼요</h2>
          <ol className="phase-list">
            <li>앱에서 수업 날짜와 시간을 골라 예약해요. 수업 {BOOKING_WINDOW_DAYS}일 전부터 예약할 수 있어요.</li>
            <li>처음 오신 날 접수에서 안내를 받고, 측정·상담실에서 운동 경험과 몸 상태를 이야기해요.</li>
            <li>60분 수업에 참여해요: {PHASES.map((p) => `${p.label} ${p.minutes}분`).join(' → ')}.</li>
            <li>운동 후 라운지에서 쉬고, 샤워·탈의실을 이용할 수 있어요.</li>
          </ol>
        </section>
        <section className="panel stack">
          <h2>알아두세요</h2>
          <ul className="plain-list">
            <li>무료체험은 신규 이용자 1인당 총 {TRIAL_TOTAL}회이며, 출석한 수업만 사용 횟수로 셉니다.</li>
            <li>유료 회원권({PLAN_INFO['1m'].label} {PLAN_INFO['1m'].price.toLocaleString('ko-KR')}원, {PLAN_INFO['3m'].label} {PLAN_INFO['3m'].price.toLocaleString('ko-KR')}원)과는 별도예요.</li>
            <li>온유 제휴몰 할인 혜택은 유료 회원에게 드려요.</li>
          </ul>
        </section>
        <section className="panel stack">
          <h2>체험 예약해 보기</h2>
          {trialMember ? (
            <>
              <p className="small">시연에서는 가상 신규 회원 {displayName(trialMember)}의 회원 화면으로 수업 예약을 이어서 보여드려요.</p>
              <button type="button" className="btn btn-primary btn-block" onClick={startBooking}>
                체험 수업 예약하기
              </button>
            </>
          ) : (
            <Notice msg={{ kind: 'info', text: '체험 횟수가 남은 가상 신규 회원이 없어요. 운영진 화면의 시연 설정에서 초기화하면 다시 볼 수 있어요.' }} />
          )}
          <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate('/facility', { state: { from: '/trial', fromState: location.state ?? undefined } satisfies BackState })}>
            시설 둘러보기
          </button>
        </section>
      </div>
    </main>
  );
}
