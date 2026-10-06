import { getCategory } from '../data/categories';
import type { CategoryId, ConditionMap } from '../lib/types';
import { Choice } from './Choice';

interface Props {
  category: CategoryId;
  values: ConditionMap | undefined;
  onChange: (key: string, value: string | string[]) => void;
  /** 그룹 만들기에서 쓰는 경우: 필수 조건 강조, 오류 표시 */
  errors?: Record<string, string | undefined>;
  idPrefix: string;
}

export function ConditionFields({ category, values, onChange, errors, idPrefix }: Props) {
  const cat = getCategory(category);
  return (
    <div className="cond-fields">
      {cat.fields.map((f) => {
        const v = values?.[f.key];
        const err = errors?.[`cond.${f.key}`];
        const name = `${idPrefix}-${category}-${f.key}`;
        return (
          <fieldset key={f.key} className="field" aria-describedby={err ? `${name}-err` : undefined}>
            <legend>
              {f.label}
              <span className={`req-tag ${f.match === 'required' ? 'req' : ''}`}>
                {f.match === 'required' ? '맞아야 추천' : '참고 정보'}
              </span>
              {f.kind === 'multi' && <span className="field-hint inline"> · 여러 개 선택</span>}
            </legend>
            <div className="pill-group">
              {f.options.map((opt) => {
                if (f.kind === 'multi') {
                  const arr = Array.isArray(v) ? v : [];
                  const checked = arr.includes(opt);
                  return (
                    <Choice
                      key={opt}
                      type="checkbox"
                      name={name}
                      checked={checked}
                      onChange={() => onChange(f.key, checked ? arr.filter((x) => x !== opt) : [...arr, opt])}
                    >
                      {opt}
                    </Choice>
                  );
                }
                return (
                  <Choice key={opt} type="radio" name={name} checked={v === opt} onChange={() => onChange(f.key, opt)}>
                    {opt}
                  </Choice>
                );
              })}
            </div>
            {err && (
              <p className="form-error" id={`${name}-err`}>
                {err}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
