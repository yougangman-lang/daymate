import { useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Choice } from '../components/Choice';
import { ConditionFields } from '../components/ConditionFields';
import { PageHeader } from '../components/ui';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';
import { LIMITS, setCondition, updateProfile } from '../lib/actions';
import { TIME_SLOT_LABEL, TIME_SLOT_RANGE, formatShortDate, formatWon, nextDays } from '../lib/date';
import type { CategoryId, TimeSlot } from '../lib/types';
import { useStore } from '../store';

const AGE_RANGES = ['20대 초반', '20대 중반', '20대 후반', '30대 초반'];
const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening'];

/** 취향 확인 1단계: 기본 정보 + 활동별 조건 (성향 테스트와 별도로 받는다) */
export function Start() {
  const { state, update, today } = useStore();
  const navigate = useNavigate();
  const { profile } = state;
  const dates = useMemo(() => nextDays(today, 14), [today]);
  const [errors, setErrors] = useState<string[]>([]);
  const nickId = useId();
  const ageId = useId();
  const budgetId = useId();

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const validDates = profile.dates.filter((d) => d >= today);

  const next = () => {
    const e: string[] = [];
    if (profile.interests.length === 0) e.push('관심 활동을 1개 이상 선택해 주세요.');
    if (validDates.length === 0) e.push('가능한 날짜를 1개 이상 선택해 주세요.');
    if (profile.timeSlots.length === 0) e.push('가능한 시간대를 1개 이상 선택해 주세요.');
    setErrors(e);
    if (e.length) {
      document.getElementById('start-errors')?.focus();
      return;
    }
    navigate('/test');
  };

  return (
    <div className="page narrow">
      <ol className="progress-steps" aria-label="진행 단계">
        <li className="current" aria-current="step">기본 정보·조건</li>
        <li>성향 5문항</li>
        <li>결과·추천</li>
      </ol>
      <PageHeader
        eyebrow="취향 확인 1/2"
        title="어떤 활동을, 언제 함께할까요?"
        desc="학교·나이·관심 활동·날짜는 성향 테스트와 별도로 받아요. 학교 인증은 안전 메뉴에서 체험할 수 있어요."
      />

      {errors.length > 0 && (
        <div id="start-errors" className="notice notice-error" role="alert" tabIndex={-1}>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="form-card">
        <h2 className="form-title">기본 정보</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor={nickId}>별명 (선택)</label>
            <input
              id={nickId}
              type="text"
              maxLength={LIMITS.nickname}
              value={profile.nickname}
              onChange={(e) => update((s) => ({ ...s, profile: { ...s.profile, nickname: e.target.value.slice(0, LIMITS.nickname) } }))}
              onBlur={(e) => update((s) => updateProfile(s, { nickname: e.target.value }))}
              placeholder="실명 대신 별명을 써 주세요"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor={ageId}>나이대</label>
            <select id={ageId} value={profile.ageRange} onChange={(e) => update((s) => updateProfile(s, { ageRange: e.target.value }))}>
              <option value="">선택 안 함</option>
              {AGE_RANGES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="field-hint">
          학교: {state.verification.schoolId ? '안전 메뉴에서 선택함' : '선택 전'} ·{' '}
          <Link to="/safety">대학생 인증(체험)으로 이동</Link>
        </p>
      </section>

      <section className="form-card">
        <fieldset className="field">
          <legend className="form-title">관심 활동 <span className="field-hint inline">여러 개 선택</span></legend>
          <div className="pill-group">
            {CATEGORIES.map((c) => (
              <Choice
                key={c.id}
                type="checkbox"
                name="interests"
                checked={profile.interests.includes(c.id)}
                onChange={() => update((s) => updateProfile(s, { interests: toggle(s.profile.interests, c.id) }))}
              >
                {c.label}
              </Choice>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="form-card">
        <fieldset className="field">
          <legend className="form-title">가능한 날짜 <span className="field-hint inline">앞으로 2주 · 여러 개 선택</span></legend>
          <div className="pill-group dates-grid">
            {dates.map((d) => {
              const f = formatShortDate(d);
              return (
                <Choice
                  key={d}
                  type="checkbox"
                  name="dates"
                  className={`date-pill ${f.weekday === '토' ? 'sat' : ''} ${f.weekday === '일' ? 'sun' : ''}`}
                  checked={profile.dates.includes(d)}
                  onChange={() => update((s) => updateProfile(s, { dates: toggle(s.profile.dates.filter((x) => x >= today), d).sort() }))}
                >
                  <small>{f.weekday}</small>
                  {f.date}
                </Choice>
              );
            })}
          </div>
          <div className="row-actions small">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                update((s) =>
                  updateProfile(s, {
                    dates: dates.filter((d) => {
                      const w = formatShortDate(d).weekday;
                      return w === '토' || w === '일';
                    }),
                  }),
                )
              }
            >
              주말만
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update((s) => updateProfile(s, { dates }))}>
              2주 전체
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update((s) => updateProfile(s, { dates: [] }))}>
              선택 해제
            </button>
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>가능한 시간대</legend>
          <div className="pill-group">
            {SLOTS.map((slot) => (
              <Choice
                key={slot}
                type="checkbox"
                name="slots"
                checked={profile.timeSlots.includes(slot)}
                onChange={() => update((s) => updateProfile(s, { timeSlots: toggle(s.profile.timeSlots, slot) }))}
              >
                {TIME_SLOT_LABEL[slot]} <small>{TIME_SLOT_RANGE[slot]}</small>
              </Choice>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="form-card">
        <div className="field">
          <label htmlFor={budgetId} className="form-title">
            1인 예산 상한 <output htmlFor={budgetId} className="budget-out">{formatWon(profile.budgetMax)}</output>
          </label>
          <input
            id={budgetId}
            type="range"
            min={0}
            max={150000}
            step={5000}
            value={profile.budgetMax}
            onChange={(e) => update((s) => updateProfile(s, { budgetMax: Number(e.target.value) }))}
            aria-valuetext={formatWon(profile.budgetMax)}
          />
          <div className="range-scale" aria-hidden="true">
            <span>0원</span>
            <span>15만 원</span>
          </div>
          <p className="field-hint">티켓·입장료·식사 등 그룹이 공개한 1인 예상 비용 기준이에요.</p>
        </div>
      </section>

      {profile.interests.length > 0 && (
        <section className="form-card">
          <h2 className="form-title">활동별 동행 조건</h2>
          <p className="field-hint">‘맞아야 추천’ 조건은 그룹과 맞을 때만 추천돼요. 모르겠다면 ‘상관없음’을 고르거나 비워 두세요.</p>
          {profile.interests.map((id: CategoryId) => (
            <details key={id} className="cond-block" open={profile.interests.length <= 2}>
              <summary>{CATEGORY_MAP[id].label}</summary>
              <ConditionFields
                category={id}
                idPrefix="profile"
                values={profile.conditions[id]}
                onChange={(key, value) => update((s) => setCondition(s, id, key, value))}
              />
            </details>
          ))}
        </section>
      )}

      <div className="sticky-actions">
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={next}>
          다음: 성향 5문항
        </button>
      </div>
    </div>
  );
}
