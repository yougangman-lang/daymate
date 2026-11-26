import { useState } from 'react';
import type { Booking, ConditionLevel } from '../domain/types';
import { CONDITION_LABEL, CONDITION_TAGS, setCondition } from '../services/booking';
import { Icon } from './Icon';
import { Notice, useRunner } from './ui';

const LEVELS: { v: ConditionLevel; sub: string }[] = [
  { v: 'good', sub: '평소처럼 움직일 수 있어요' },
  { v: 'tired', sub: '강도를 조금 낮추면 좋겠어요' },
  { v: 'discomfort', sub: '아래에서 불편한 곳을 골라 주세요' },
];

export function ConditionSummary({ booking }: { booking: Booking }) {
  const c = booking.condition;
  if (!c) return <span className="muted">아직 알려주지 않았어요</span>;
  return (
    <span>
      <span className={`tag ${c.level === 'good' ? 'tag-ok' : c.level === 'tired' ? 'tag-warn' : 'tag-danger'}`}>{CONDITION_LABEL[c.level]}</span>
      {c.tags.length > 0 && <span> · {c.tags.join(', ')}</span>}
      {c.memo && <span> · “{c.memo}”</span>}
    </span>
  );
}

export function ConditionForm({ booking, memberId, onDone }: { booking: Booking; memberId: string; onDone?: () => void }) {
  const [level, setLevel] = useState<ConditionLevel | null>(booking.condition?.level ?? null);
  const [tags, setTags] = useState<string[]>(booking.condition?.tags ?? []);
  const [memo, setMemo] = useState(booking.condition?.memo ?? '');
  const { run, msg, setMsg } = useRunner();

  const submit = () => {
    if (!level) {
      setMsg({ kind: 'error', text: '오늘 컨디션을 먼저 골라 주세요.' });
      return;
    }
    const r = run((s, now) => setCondition(s, memberId, booking.id, { level, tags, memo }, now), '전달했어요');
    if (r.ok) onDone?.();
  };

  return (
    <div className="stack">
      <fieldset className="stack-sm">
        <legend className="strong" style={{ marginBottom: 8 }}>
          지금 몸 상태는 어떠세요?
        </legend>
        <div className="choices" role="radiogroup" aria-label="오늘 컨디션">
          {LEVELS.map((l) => (
            <button key={l.v} type="button" role="radio" aria-checked={level === l.v} className="choice" onClick={() => setLevel(l.v)}>
              <span className="check">{level === l.v && <Icon name="check" size={16} />}</span>
              <span>
                {CONDITION_LABEL[l.v]}
                <span className="sub">{l.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="stack-sm">
        <legend className="strong" style={{ marginBottom: 8 }}>
          해당되는 것을 골라 주세요 <span className="muted small">(선택)</span>
        </legend>
        <div className="chips">
          {CONDITION_TAGS.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={tags.includes(t)} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor={`memo-${booking.id}`}>
          짧게 남길 말 <span className="muted small">(선택, 80자)</span>
        </label>
        <input id={`memo-${booking.id}`} className="input" maxLength={80} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 계단 내려갈 때 무릎이 시큰해요" />
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        컨디션 전달하기
      </button>
      <Notice msg={msg} />
    </div>
  );
}
