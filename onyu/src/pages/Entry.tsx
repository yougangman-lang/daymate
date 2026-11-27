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
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/facility', { state: { from: '/' } })}>
            시설 둘러보기
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/coaches', { state: { from: '/' } })}>
            코치 소개
          </button>
        </div>
      </div>
    </main>
  );
}
