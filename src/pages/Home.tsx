import { Link } from 'react-router-dom';
import { CategoryArt } from '../components/CategoryArt';
import { GroupCard } from '../components/GroupCard';
import { Icon } from '../components/ui';
import { CATEGORIES } from '../data/categories';
import { filterExplore } from '../lib/matching';
import { useStore } from '../store';

const STEPS = [
  { n: '01', title: '취향 확인', desc: '관심 활동·날짜·예산과 5문항 동행 성향' },
  { n: '02', title: '그룹 추천', desc: '조건이 맞는 그룹을 성향 근접도 순으로' },
  { n: '03', title: '그룹 상세', desc: '비용·동선·해산 계획·다른 점까지 확인' },
  { n: '04', title: '동행 참여', desc: '참여 요청 또는 받은 초대 수락' },
];

export function Home() {
  const { state, groups, today } = useStore();
  const upcoming = filterExplore(groups, { category: 'all', date: 'all', budgetMax: null, onlyOpen: true }, state.blocks, today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 6);
  const done = !!state.test.result;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">대학생·청년 일상 여가 동행</p>
          <h1>
            가고 싶은 곳은 있는데,
            <br />
            <span className="hl">같이 갈 사람</span>이 없을 때.
          </h1>
          <p className="hero-desc">
            야구 직관, 성수 팝업, 전시 관람처럼 이미 하고 싶은 활동이 있다면 동호회 가입 없이 이번 한 번만 함께할 동행을 찾아보세요.
          </p>
          <div className="hero-actions">
            <Link to={done ? '/result' : '/start'} className="btn btn-primary btn-lg">
              {done ? '내 추천 그룹 보기' : '취향 확인하고 추천받기'}
            </Link>
            <Link to="/explore" className="btn btn-outline btn-lg">
              활동별 둘러보기
            </Link>
          </div>
          <p className="hero-note">약 2분 · 5문항 · 결과는 이 브라우저에만 저장</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-tile t1"><CategoryArt category="baseball" /></div>
          <div className="hero-tile t2"><CategoryArt category="exhibition" /></div>
          <div className="hero-tile t3"><CategoryArt category="shopping" /></div>
          <div className="hero-tile t4"><CategoryArt category="picnic" /></div>
        </div>
      </section>

      <section className="section" aria-labelledby="flow-title">
        <h2 id="flow-title" className="section-title">이렇게 찾아요</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n} className="step">
              <span className="step-n">{s.n}</span>
              <strong>{s.title}</strong>
              <span>{s.desc}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="cat-title">
        <div className="section-head">
          <h2 id="cat-title" className="section-title">어떤 활동을 함께할까요?</h2>
          <Link to="/explore" className="more-link">전체 보기</Link>
        </div>
        <ul className="cat-grid">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link to={`/explore?cat=${c.id}`} className="cat-tile">
                <CategoryArt category={c.id} />
                <span className="cat-tile-label">
                  <strong>{c.label}</strong>
                  <span>{c.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="soon-title">
        <div className="section-head">
          <h2 id="soon-title" className="section-title">곧 열리는 예시 동행</h2>
          <Link to="/explore" className="more-link">더 보기</Link>
        </div>
        <p className="section-sub">아래 그룹과 일정은 시제품 시연을 위한 허구 데이터예요.</p>
        <div className="card-grid">
          {upcoming.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      </section>

      <section className="section split">
        <div className="feature-card dark">
          <Icon name="spark" size={28} />
          <h2>역매칭: 그룹이 먼저 초대해요</h2>
          <p>공개에 동의한 사람만 후보가 돼요. 호스트가 조건이 맞는 참여자에게 초대를 보내고, 참여자가 수락해야 확정돼요.</p>
          <div className="row-actions">
            <Link to="/host" className="btn btn-lime">호스트 화면</Link>
            <Link to="/invites" className="btn btn-outline-light">받은 초대</Link>
          </div>
        </div>
        <div className="feature-card">
          <Icon name="shield" size={28} />
          <h2>처음 만나는 사람과 안전하게</h2>
          <ul className="bullets">
            <li>첫 만남은 공개 장소에서</li>
            <li>활동 시간·예상 비용·해산 계획을 미리 공개</li>
            <li>추가 구매·뒤풀이·사진 촬영은 본인 선택</li>
            <li>신고·차단 즉시 추천과 역매칭에서 제외</li>
          </ul>
          <Link to="/safety" className="btn btn-outline">안전 안내·학교 인증 체험</Link>
        </div>
      </section>
    </div>
  );
}
