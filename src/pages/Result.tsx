import { Link, useNavigate } from 'react-router-dom';
import { GroupCard } from '../components/GroupCard';
import { OptInCard } from '../components/OptInCard';
import { TraitRadar } from '../components/Traits';
import { EmptyState, NeedTest, PageHeader } from '../components/ui';
import { AXES } from '../data/axes';
import { CATEGORY_MAP } from '../data/categories';
import { startEditTest } from '../lib/actions';
import { TIME_SLOT_LABEL, formatWon } from '../lib/date';
import { EXCLUSION_TIPS, recommendGroups, type ExclusionReason } from '../lib/matching';
import { useStore } from '../store';

export function Result() {
  const { state, update, groups, today } = useStore();
  const navigate = useNavigate();
  const traits = state.test.result;
  const answered = state.test.draft.filter((v) => v !== null).length;

  if (!traits) {
    if (answered > 0)
      return (
        <div className="page narrow">
          <EmptyState title="아직 결과가 확정되지 않았어요" action={<Link to="/test" className="btn btn-primary">이어서 답하기</Link>}>
            <p>5문항 중 {answered}문항에 답했어요. 5문항을 모두 마쳐야 동행 선호 프로필과 추천이 확정돼요.</p>
          </EmptyState>
        </div>
      );
    return (
      <div className="page narrow">
        <NeedTest />
      </div>
    );
  }

  const { profile } = state;
  const { items, exclusionCounts } = recommendGroups(groups, profile, traits, state.blocks, today);
  const futureDates = profile.dates.filter((d) => d >= today);
  const tips = (Object.keys(exclusionCounts) as ExclusionReason[]).sort((a, b) => (exclusionCounts[b] ?? 0) - (exclusionCounts[a] ?? 0));

  return (
    <div className="page">
      <ol className="progress-steps narrow-steps" aria-label="진행 단계">
        <li className="done"><Link to="/start">기본 정보·조건</Link></li>
        <li className="done"><Link to="/test">성향 5문항</Link></li>
        <li className="current" aria-current="step">결과·추천</li>
      </ol>
      <PageHeader eyebrow="결과" title="나의 동행 선호 프로필" desc="검증된 심리검사가 아닌, 함께 다닐 때 선호하는 방식을 정리한 결과예요." />

      <section className="profile-card">
        <div className="profile-radar">
          <TraitRadar traits={traits} />
        </div>
        <div className="profile-detail">
          <ul className="axis-list">
            {AXES.map((a, i) => (
              <li key={a.key}>
                <span>{a.name}</span>
                <strong>{a.options.find((o) => o.value === traits[i])!.label}</strong>
              </li>
            ))}
          </ul>
          <div className="profile-conds">
            <p>
              <strong>관심 활동</strong> {profile.interests.map((c) => CATEGORY_MAP[c].short).join(', ') || '없음'}
            </p>
            <p>
              <strong>가능한 날짜</strong> {futureDates.length}일 · {profile.timeSlots.map((s) => TIME_SLOT_LABEL[s]).join('·') || '시간대 없음'}
            </p>
            <p>
              <strong>예산 상한</strong> {formatWon(profile.budgetMax)}
            </p>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                update(startEditTest);
                navigate('/test');
              }}
            >
              결과 수정
            </button>
            <Link to="/start" className="btn btn-ghost">
              조건 수정
            </Link>
          </div>
        </div>
      </section>

      <OptInCard />

      <section className="section" aria-labelledby="rec-title">
        <div className="section-head">
          <h2 id="rec-title" className="section-title">추천 그룹 {items.length}개</h2>
        </div>
        <p className="section-sub">관심 활동·날짜·시간·예산·잔여 인원·활동별 조건·차단 여부로 먼저 거른 뒤, 성향 근접도 순으로 정렬했어요.</p>
        {items.length === 0 ? (
          <EmptyState
            title="지금 조건에 맞는 그룹이 없어요"
            action={
              <div className="row-actions">
                <Link to="/start" className="btn btn-primary">조건 조정하기</Link>
                <Link to="/create" className="btn btn-outline">직접 그룹 만들기</Link>
              </div>
            }
          >
            <ul className="tips">
              {tips.length === 0 && <li>{EXCLUSION_TIPS.category}</li>}
              {tips.map((t) => (
                <li key={t}>
                  {EXCLUSION_TIPS[t]} <span className="muted">({exclusionCounts[t]}개 그룹 해당)</span>
                </li>
              ))}
            </ul>
          </EmptyState>
        ) : (
          <div className="card-grid">
            {items.map((r) => (
              <GroupCard key={r.group.id} group={r.group} score={r.score} reasons={r.reasons} />
            ))}
          </div>
        )}
        <p className="fine-print">성향 근접도 = 100 − 5개 성향 값 차이의 평균. 함께했을 때의 만족이나 매칭 성공을 예측하는 값이 아니에요.</p>
      </section>
    </div>
  );
}
