import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AXES } from '../data/axes';
import { answerQuestion, completeTest } from '../lib/actions';
import { useStore } from '../store';

export function Test() {
  const { state, update, toast } = useStore();
  const navigate = useNavigate();
  const { draft, result } = state.test;
  const firstOpen = draft.findIndex((v) => v === null);
  const [step, setStep] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  const axis = AXES[step];
  const current = draft[step];
  const answered = draft.filter((v) => v !== null).length;
  const isLast = step === AXES.length - 1;

  const finish = () => {
    const r = completeTest(state);
    if (!r.ok) {
      setError(r.error);
      const missing = draft.findIndex((v) => v === null);
      if (missing >= 0) setStep(missing);
      return;
    }
    update(() => r.state);
    toast('동행 선호 프로필을 확정했어요.');
    navigate('/result');
  };

  return (
    <div className="page narrow test-page">
      <ol className="progress-steps" aria-label="진행 단계">
        <li className="done">
          <Link to="/start">기본 정보·조건</Link>
        </li>
        <li className="current" aria-current="step">성향 5문항</li>
        <li>결과·추천</li>
      </ol>

      <div className="test-progress">
        <div className="tp-top">
          <span className="eyebrow">동행 성향 {step + 1} / 5</span>
          <span className="tp-count">{answered}개 답함</span>
        </div>
        <div
          className="tp-bar"
          role="progressbar"
          aria-label="테스트 진행률"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={answered}
          aria-valuetext={`5문항 중 ${answered}문항 답함`}
        >
          <span style={{ width: `${(answered / 5) * 100}%` }} />
        </div>
        <ol className="tp-dots" aria-label="문항 바로가기">
          {AXES.map((a, i) => (
            <li key={a.key}>
              <button
                type="button"
                className={`tp-dot ${i === step ? 'current' : ''} ${draft[i] !== null ? 'answered' : ''}`}
                aria-label={`${i + 1}번 ${a.name}${draft[i] !== null ? ' (답함)' : ''}`}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {result && (
        <p className="notice" role="note">
          결과 수정 중이에요. 5문항을 다시 확정하기 전까지는 기존 결과로 추천돼요.
        </p>
      )}

      <fieldset className="question">
        <legend>
          <span className="q-axis">{axis.name}</span>
          <h1 ref={headingRef} tabIndex={-1} className="q-title">
            {axis.question}
          </h1>
        </legend>
        <div className="q-options">
          {axis.options.map((opt) => (
            <label key={opt.value} className="q-option">
              <input
                type="radio"
                name={`q-${axis.key}`}
                value={opt.value}
                checked={current === opt.value}
                onChange={() => {
                  setError('');
                  update((s) => answerQuestion(s, step, opt.value));
                }}
              />
              <span className="q-card">
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="test-nav">
        <button type="button" className="btn btn-outline btn-lg" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          이전 문항
        </button>
        {isLast ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={finish}>
            결과 확정하기
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setStep((s) => s + 1)} disabled={current === null}>
            다음 문항
          </button>
        )}
      </div>
      <p className="fine-print">
        이 테스트는 함께 다닐 때의 선호를 정리하는 간단한 질문이며, 검증된 심리검사가 아니에요. 각 답은 0·50·100으로 저장돼요.
      </p>
    </div>
  );
}
