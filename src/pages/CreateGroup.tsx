import { useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Choice } from '../components/Choice';
import { ConditionFields } from '../components/ConditionFields';
import { PageHeader } from '../components/ui';
import { AXES } from '../data/axes';
import { CATEGORIES, getCategory } from '../data/categories';
import { LIMITS, createGroup, type GroupErrors, type GroupInput } from '../lib/actions';
import { addDays } from '../lib/date';
import type { AxisValue, CategoryId, Traits } from '../lib/types';
import { useStore } from '../store';

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p className="form-error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateGroup() {
  const { state, update, toast, today } = useStore();
  const navigate = useNavigate();
  const uid = useId();
  const [errors, setErrors] = useState<GroupErrors>({});
  const [input, setInput] = useState<GroupInput>(() => ({
    category: state.profile.interests[0] ?? 'exhibition',
    title: '',
    description: '',
    place: '',
    meetingPoint: '',
    date: addDays(today, 3),
    startTime: '14:00',
    endTime: '17:00',
    capacity: 4,
    costTotal: 15000,
    included: '',
    separate: '',
    prefs: (state.test.result ?? [50, 50, 50, 50, 50]) as Traits,
    conditions: {},
    route: '',
    extras: [{ label: '', required: false }],
    dismissPlan: '',
    cancelPolicy: '하루 전까지 취소 가능',
  }));

  const set = <K extends keyof GroupInput>(key: K, value: GroupInput[K]) => setInput((s) => ({ ...s, [key]: value }));
  const fid = (k: string) => `${uid}-${k}`;
  const describedBy = (k: string) => (errors[k] ? `${fid(k)}-err` : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = createGroup(state, input, today);
    if (!r.ok) {
      setErrors(r.errors ?? {});
      toast('입력 내용을 확인해 주세요.', 'error');
      requestAnimationFrame(() => {
        const firstErr = document.querySelector<HTMLElement>('.has-error input, .has-error textarea, .has-error select, fieldset[aria-describedby] input');
        firstErr?.focus();
      });
      return;
    }
    update(() => r.state);
    toast('그룹을 만들었어요. 둘러보기와 역매칭에 반영됐어요.');
    navigate(`/groups/${r.group!.id}`);
  };

  return (
    <div className="page narrow">
      <PageHeader
        eyebrow="새 그룹 만들기"
        title="함께할 활동을 열어 보세요"
        desc="만든 그룹은 이 브라우저의 둘러보기와 역매칭에 바로 반영돼요. 시제품이라 다른 사용자에게 공개되지는 않아요."
      />
      <form onSubmit={submit} noValidate>
        <section className="form-card">
          <fieldset className="field">
            <legend className="form-title">활동</legend>
            <div className="pill-group">
              {CATEGORIES.map((c) => (
                <Choice
                  key={c.id}
                  type="radio"
                  name="category"
                  checked={input.category === c.id}
                  onChange={() => setInput((s) => ({ ...s, category: c.id as CategoryId, conditions: {} }))}
                >
                  {c.label}
                </Choice>
              ))}
            </div>
          </fieldset>
          <Field id={fid('title')} label="제목" error={errors.title} hint={`${input.title.length}/${LIMITS.groupTitle}`}>
            <input id={fid('title')} type="text" maxLength={LIMITS.groupTitle} value={input.title} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} aria-describedby={describedBy('title')} placeholder="예: 토요일 오후 전시 천천히 보실 분" />
          </Field>
          <Field id={fid('description')} label="활동 설명" error={errors.description}>
            <textarea id={fid('description')} rows={4} maxLength={LIMITS.groupDescription} value={input.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!errors.description} aria-describedby={describedBy('description')} placeholder="어떤 분위기로 무엇을 하는지 적어 주세요." />
          </Field>
        </section>

        <section className="form-card">
          <h2 className="form-title">일정·장소</h2>
          <div className="grid-3">
            <Field id={fid('date')} label="날짜" error={errors.date}>
              <input id={fid('date')} type="date" min={today} value={input.date} onChange={(e) => set('date', e.target.value)} aria-invalid={!!errors.date} aria-describedby={describedBy('date')} />
            </Field>
            <Field id={fid('startTime')} label="시작" error={errors.startTime}>
              <input id={fid('startTime')} type="time" value={input.startTime} onChange={(e) => set('startTime', e.target.value)} aria-invalid={!!errors.startTime} />
            </Field>
            <Field id={fid('endTime')} label="종료" error={errors.endTime}>
              <input id={fid('endTime')} type="time" value={input.endTime} onChange={(e) => set('endTime', e.target.value)} aria-invalid={!!errors.endTime} aria-describedby={describedBy('endTime')} />
            </Field>
          </div>
          <Field id={fid('place')} label="활동 장소" error={errors.place} hint="동네·시설 단위로 적어 주세요.">
            <input id={fid('place')} type="text" maxLength={LIMITS.groupPlace} value={input.place} onChange={(e) => set('place', e.target.value)} aria-invalid={!!errors.place} aria-describedby={describedBy('place')} placeholder="예: 종로 일대 미술관" />
          </Field>
          <Field id={fid('meetingPoint')} label="첫 만남 장소 (공개 장소)" error={errors.meetingPoint} hint="역 출구, 매표소 앞, 로비처럼 사람이 많은 공개 장소만 가능해요.">
            <input id={fid('meetingPoint')} type="text" maxLength={LIMITS.groupMeeting} value={input.meetingPoint} onChange={(e) => set('meetingPoint', e.target.value)} aria-invalid={!!errors.meetingPoint} aria-describedby={describedBy('meetingPoint')} placeholder="예: ○○역 1번 출구 앞" />
          </Field>
          <Field id={fid('dismissPlan')} label="해산 계획" error={errors.dismissPlan}>
            <input id={fid('dismissPlan')} type="text" maxLength={200} value={input.dismissPlan} onChange={(e) => set('dismissPlan', e.target.value)} aria-invalid={!!errors.dismissPlan} aria-describedby={describedBy('dismissPlan')} placeholder="예: 관람 후 로비에서 해산" />
          </Field>
          <Field id={fid('route')} label="간단한 동선 (한 줄에 하나, 선택)">
            <textarea id={fid('route')} rows={3} value={input.route} onChange={(e) => set('route', e.target.value)} placeholder={'로비에서 만나기\n관람\n카페(선택) 후 해산'} />
          </Field>
        </section>

        <section className="form-card">
          <h2 className="form-title">인원·비용</h2>
          <div className="grid-2">
            <Field id={fid('capacity')} label="정원 (호스트 포함)" error={errors.capacity}>
              <select id={fid('capacity')} value={input.capacity} onChange={(e) => set('capacity', Number(e.target.value))}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </select>
            </Field>
            <Field id={fid('costTotal')} label="1인 예상 비용 (원)" error={errors.costTotal}>
              <input id={fid('costTotal')} type="number" inputMode="numeric" min={0} max={LIMITS.maxCost} step={1000} value={Number.isNaN(input.costTotal) ? '' : input.costTotal} onChange={(e) => set('costTotal', e.target.value === '' ? NaN : Number(e.target.value))} aria-invalid={!!errors.costTotal} aria-describedby={describedBy('costTotal')} />
            </Field>
          </div>
          <div className="grid-2">
            <Field id={fid('included')} label="포함 비용 (쉼표로 구분)">
              <input id={fid('included')} type="text" value={input.included} onChange={(e) => set('included', e.target.value)} placeholder="예: 입장료" />
            </Field>
            <Field id={fid('separate')} label="별도 비용 (쉼표로 구분)">
              <input id={fid('separate')} type="text" value={input.separate} onChange={(e) => set('separate', e.target.value)} placeholder="예: 음료, 굿즈" />
            </Field>
          </div>
          <fieldset className="field">
            <legend>추가 활동</legend>
            {input.extras.map((x, i) => (
              <div key={i} className="extra-row">
                <label className="sr-only" htmlFor={fid(`extra-${i}`)}>
                  추가 활동 {i + 1}
                </label>
                <input
                  id={fid(`extra-${i}`)}
                  type="text"
                  maxLength={40}
                  value={x.label}
                  placeholder="예: 관람 후 카페"
                  onChange={(e) => set('extras', input.extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
                />
                <label className="check-row compact">
                  <input type="checkbox" checked={x.required} onChange={(e) => set('extras', input.extras.map((y, j) => (j === i ? { ...y, required: e.target.checked } : y)))} />
                  <span>필수</span>
                </label>
                <button type="button" className="btn btn-ghost btn-sm" aria-label={`추가 활동 ${i + 1} 삭제`} onClick={() => set('extras', input.extras.filter((_, j) => j !== i))}>
                  삭제
                </button>
              </div>
            ))}
            {input.extras.length < 5 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('extras', [...input.extras, { label: '', required: false }])}>
                + 추가 활동
              </button>
            )}
            <p className="field-hint">체크하지 않으면 ‘선택’으로 표시돼요. 뒤풀이·추가 구매는 가급적 선택으로 두세요.</p>
          </fieldset>
          <Field id={fid('cancelPolicy')} label="취소 기준" error={errors.cancelPolicy}>
            <input id={fid('cancelPolicy')} type="text" maxLength={200} value={input.cancelPolicy} onChange={(e) => set('cancelPolicy', e.target.value)} aria-invalid={!!errors.cancelPolicy} aria-describedby={describedBy('cancelPolicy')} />
          </Field>
        </section>

        <section className="form-card">
          <h2 className="form-title">그룹의 동행 선호</h2>
          {AXES.map((axis, i) => (
            <fieldset key={axis.key} className="field">
              <legend>{axis.name}</legend>
              <div className="pill-group">
                {axis.options.map((o) => (
                  <Choice
                    key={o.value}
                    type="radio"
                    name={`pref-${axis.key}`}
                    checked={input.prefs[i] === o.value}
                    onChange={() => set('prefs', input.prefs.map((v, j) => (j === i ? o.value : v)) as Traits)}
                  >
                    {axis.groupStyle[o.value as AxisValue]}
                  </Choice>
                ))}
              </div>
            </fieldset>
          ))}
        </section>

        <section className="form-card">
          <h2 className="form-title">{getCategory(input.category).label} 조건</h2>
          <p className="field-hint">‘맞아야 추천’ 항목은 필수예요. 참여자 조건과 비교해 추천·역매칭에 쓰여요.</p>
          <ConditionFields
            category={input.category}
            idPrefix={`${uid}-create`}
            values={input.conditions}
            errors={errors}
            onChange={(key, value) =>
              setInput((s) => {
                const conditions = { ...s.conditions };
                if (Array.isArray(value) && value.length === 0) delete conditions[key];
                else conditions[key] = value;
                return { ...s, conditions };
              })
            }
          />
        </section>

        <div className="sticky-actions">
          <button type="submit" className="btn btn-primary btn-lg btn-block">
            그룹 만들기
          </button>
        </div>
      </form>
    </div>
  );
}
