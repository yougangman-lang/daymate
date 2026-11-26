import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useStore } from '../store/store';
import { setDemo } from '../services/demo';

export function Entry() {
  const store = useStore();
  const navigate = useNavigate();
  const go = (view: 'member' | 'staff') => {
    store.run((s) => setDemo(s, { view, ...(view === 'staff' ? { staffKind: 'manager' as const } : {}) }));
    navigate(view === 'member' ? '/member' : '/staff');
  };
  return (
    <main className="entry">
      <div className="entry-card">
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <BrandLogo size="lg" />
        </div>
        <div className="stack-sm">
          <p className="tagline">함께 움직이는 즐거움</p>
          <p className="intro">운동과 휴식이 함께하는 공간, 온유.</p>
        </div>
        <div className="entry-actions">
          <button type="button" className="btn btn-primary" onClick={() => go('member')}>
            회원 화면으로 시작하기
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => go('staff')}>
            운영진(매니저·코치) 화면 보기
          </button>
        </div>
        <div className="panel-soft small" style={{ textAlign: 'left' }}>
          <strong>대학 과제 발표용 시연 프로토타입이에요.</strong>
          <ul style={{ paddingLeft: '1.2rem', marginTop: 6 }}>
            <li>회원·건강 정보·가격·제휴 조건은 모두 가상 데이터예요.</li>
            <li>실제 결제, 실제 인바디 연동, 실제 로그인은 없어요. 화면 위쪽의 역할 전환은 시연 장치예요.</li>
            <li>상태는 이 브라우저에만 저장되고 다른 기기와 동기화되지 않아요.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
