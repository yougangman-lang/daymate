import { useId, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GroupCard } from '../components/GroupCard';
import { EmptyState, PageHeader } from '../components/ui';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';
import { formatShortDate, nextDays } from '../lib/date';
import { filterExplore, proximity, type ExploreFilter } from '../lib/matching';
import type { CategoryId } from '../lib/types';
import { useStore } from '../store';

const BUDGETS = [
  { value: '', label: '예산 전체' },
  { value: '10000', label: '1만 원 이하' },
  { value: '20000', label: '2만 원 이하' },
  { value: '30000', label: '3만 원 이하' },
  { value: '50000', label: '5만 원 이하' },
];

export function Explore() {
  const { state, groups, today } = useStore();
  const [params, setParams] = useSearchParams();
  const budgetId = useId();
  const sortId = useId();
  const dates = useMemo(() => nextDays(today, 14), [today]);

  const catParam = params.get('cat');
  const category: ExploreFilter['category'] = catParam && catParam in CATEGORY_MAP ? (catParam as CategoryId) : 'all';
  const dateParam = params.get('date');
  const date = dateParam && dates.includes(dateParam) ? dateParam : 'all';
  const budgetParam = Number(params.get('budget'));
  const budgetMax = budgetParam > 0 ? budgetParam : null;
  const onlyOpen = params.get('open') !== '0';
  const traits = state.test.result;
  const sort = params.get('sort') === 'score' && traits ? 'score' : 'date';

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const list = filterExplore(groups, { category, date, budgetMax, onlyOpen }, state.blocks, today)
    .map((g) => ({ g, score: traits ? proximity(traits, g.prefs) : undefined }))
    .sort((a, b) =>
      sort === 'score'
        ? (b.score ?? 0) - (a.score ?? 0) || (a.g.date + a.g.startTime).localeCompare(b.g.date + b.g.startTime)
        : (a.g.date + a.g.startTime).localeCompare(b.g.date + b.g.startTime),
    );

  return (
    <div className="page">
      <PageHeader
        eyebrow="활동별 동행 둘러보기"
        title={category === 'all' ? '모든 활동' : CATEGORY_MAP[category].label}
        desc={category === 'all' ? '하고 싶은 활동을 고르고 날짜와 예산으로 좁혀 보세요.' : CATEGORY_MAP[category].scheduleNote}
        action={<Link to="/create" className="btn btn-dark btn-sm">+ 새 그룹 만들기</Link>}
      />

      <section className="filters" aria-label="필터">
        <div className="chip-scroll" role="group" aria-label="활동 선택">
          <button type="button" className="chip" aria-pressed={category === 'all'} onClick={() => set('cat', null)}>
            전체
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => set('cat', c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="chip-scroll dates" role="group" aria-label="날짜 선택">
          <button type="button" className="date-chip all" aria-pressed={date === 'all'} onClick={() => set('date', null)}>
            <span className="dc-day">전체</span>
            <span className="dc-week">날짜</span>
          </button>
          {dates.map((d) => {
            const f = formatShortDate(d);
            return (
              <button
                key={d}
                type="button"
                className={`date-chip ${f.weekday === '토' ? 'sat' : ''} ${f.weekday === '일' ? 'sun' : ''}`}
                aria-pressed={date === d}
                aria-label={`${f.date} ${f.weekday}요일`}
                onClick={() => set('date', date === d ? null : d)}
              >
                <span className="dc-week">{f.weekday}</span>
                <span className="dc-day">{f.day}</span>
              </button>
            );
          })}
        </div>

        <div className="filter-row">
          <div className="select-wrap">
            <label htmlFor={budgetId} className="sr-only">
              1인 예산
            </label>
            <select id={budgetId} value={budgetMax ?? ''} onChange={(e) => set('budget', e.target.value)}>
              {BUDGETS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <label htmlFor={sortId} className="sr-only">
              정렬
            </label>
            <select id={sortId} value={sort} onChange={(e) => set('sort', e.target.value === 'date' ? null : e.target.value)}>
              <option value="date">날짜순</option>
              <option value="score" disabled={!traits}>
                성향 근접도순{traits ? '' : ' (테스트 후)'}
              </option>
            </select>
          </div>
          <label className="check-row compact">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => set('open', e.target.checked ? null : '0')} />
            <span>모집 중만</span>
          </label>
        </div>
      </section>

      <p className="result-count" aria-live="polite">
        {list.length}개 그룹 · 예시 데이터(허구)와 내가 만든 그룹
      </p>

      {list.length === 0 ? (
        <EmptyState
          title="조건에 맞는 그룹이 없어요"
          action={
            <div className="row-actions">
              <button type="button" className="btn btn-outline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                필터 초기화
              </button>
              <Link to="/create" className="btn btn-primary">직접 그룹 만들기</Link>
            </div>
          }
        >
          <p>날짜를 ‘전체’로 바꾸거나 예산 범위를 넓혀 보세요.</p>
        </EmptyState>
      ) : (
        <div className="card-grid">
          {list.map(({ g, score }) => (
            <GroupCard key={g.id} group={g} score={score} />
          ))}
        </div>
      )}
    </div>
  );
}
