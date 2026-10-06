import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Choice } from '../components/Choice';
import { DemoNote, PageHeader } from '../components/ui';
import { SCHOOLS } from '../data/seed';
import { useStore } from '../store';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function makeCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, '0');
}

export function Safety() {
  const { state, update, toast } = useStore();
  const v = state.verification;
  const [schoolId, setSchoolId] = useState<string | null>(v.schoolId);
  // 이메일 아이디와 인증 코드는 저장하지 않고 이 화면에서만 사용한다
  const [local, setLocal] = useState('');
  const [sent, setSent] = useState<{ code: string; to: string; at: number } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const localId = useId();
  const codeId = useId();
  const school = SCHOOLS.find((s) => s.id === schoolId);

  const sendCode = () => {
    setError('');
    if (!school) return setError('학교를 먼저 선택해 주세요.');
    const trimmed = local.trim();
    if (trimmed.includes('@')) return setError('@ 앞부분만 입력해 주세요. 도메인은 선택한 학교의 승인 도메인으로 고정돼요.');
    if (!/^[a-z0-9._-]{2,30}$/i.test(trimmed)) return setError('영문·숫자·.-_ 조합 2~30자로 입력해 주세요.');
    setSent({ code: makeCode(), to: `${trimmed}@${school.domain}`, at: Date.now() });
    setAttempts(0);
    setCodeInput('');
  };

  const verify = () => {
    if (!sent) return;
    setError('');
    if (Date.now() - sent.at > CODE_TTL_MS) {
      setSent(null);
      return setError('코드가 만료됐어요. 다시 받아 주세요.');
    }
    if (codeInput.trim() !== sent.code) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= MAX_ATTEMPTS) {
        setSent(null);
        return setError('5회 틀려서 코드가 무효가 됐어요. 다시 받아 주세요.');
      }
      return setError(`코드가 맞지 않아요. (${n}/${MAX_ATTEMPTS})`);
    }
    update((s) => ({ ...s, verification: { schoolId: school!.id, status: 'demo-completed', completedAt: new Date().toISOString() } }));
    setSent(null);
    setLocal('');
    setCodeInput('');
    toast('학교 메일 인증 체험을 마쳤어요. 실제 인증은 아니에요.');
  };

  return (
    <div className="page narrow">
      <PageHeader eyebrow="대학생 인증·안전 안내" title="처음 만나는 동행, 미리 확인해요" />

      <section className="form-card" aria-labelledby="verify-title">
        <h2 id="verify-title" className="form-title">대학생 인증 <span className="demo-pill">체험 모드</span></h2>
        <DemoNote>
          실제 메일 발송 서비스가 연결되지 않아 인증 코드를 화면의 ‘체험용 메일함’에 보여줘요. 실제 학교 이메일·학생증·학번은 받지 않으며,
          선택지는 모두 가상 학교와 테스트용 도메인(.example)이에요. 체험 완료는 실제 인증 배지가 아니에요.
        </DemoNote>

        {v.status === 'demo-completed' ? (
          <div className="verify-done">
            <p>
              <span className="tag tag-muted big">체험 완료 · 실제 인증 아님</span>
            </p>
            <p>
              {SCHOOLS.find((s) => s.id === v.schoolId)?.name} 메일 인증 흐름을 체험했어요. 실제 서비스에서는 학교 메일 확인과 별도로
              현재 재학 상태 확인이 필요할 수 있어요.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => update((s) => ({ ...s, verification: { schoolId: null, status: 'none', completedAt: null } }))}
            >
              체험 기록 지우고 다시 해보기
            </button>
          </div>
        ) : (
          <ol className="verify-steps">
            <li>
              <fieldset className="field">
                <legend>1. 학교 선택</legend>
                <div className="pill-group">
                  {SCHOOLS.map((s) => (
                    <Choice key={s.id} type="radio" name="school" checked={schoolId === s.id} onChange={() => { setSchoolId(s.id); setSent(null); }}>
                      {s.name}
                    </Choice>
                  ))}
                </div>
              </fieldset>
            </li>
            <li>
              <div className="field">
                <label htmlFor={localId}>2. 학교 이메일 (승인된 도메인만)</label>
                <div className="email-row">
                  <input
                    id={localId}
                    type="text"
                    inputMode="email"
                    autoComplete="off"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    placeholder="아이디"
                    disabled={!school}
                    aria-describedby={`${localId}-hint`}
                  />
                  <span className="email-domain">@{school?.domain ?? '학교 선택 필요'}</span>
                </div>
                <p className="field-hint" id={`${localId}-hint`}>
                  체험용이니 실제 아이디 대신 아무 영문(예: test01)을 넣어 주세요. 입력값은 저장하지 않아요.
                </p>
                <button type="button" className="btn btn-outline" onClick={sendCode} disabled={!school}>
                  {sent ? '코드 다시 받기 (체험)' : '인증 코드 받기 (체험)'}
                </button>
              </div>
            </li>
            {sent && (
              <li>
                <div className="mock-inbox" role="region" aria-label="체험용 메일함">
                  <p className="mi-head">체험용 메일함 · 실제 메일이 아니에요</p>
                  <p>
                    받는 사람: {sent.to}
                    <br />
                    DAYMATE 인증 코드: <strong className="mi-code">{sent.code}</strong> (5분 유효)
                  </p>
                </div>
                <div className="field">
                  <label htmlFor={codeId}>3. 인증 코드 6자리</label>
                  <div className="email-row">
                    <input id={codeId} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))} />
                    <button type="button" className="btn btn-primary" onClick={verify}>
                      확인
                    </button>
                  </div>
                </div>
              </li>
            )}
            <li className="muted">
              4. (필요 시) 현재 재학 상태 추가 확인 — 학교 메일은 졸업 후에도 유지될 수 있어 메일만으로 재학생이라고 단정하지 않아요. 실제
              서비스에서는 재학 확인 절차를 별도로 연동해야 하며, 시제품에서는 제공하지 않아요.
            </li>
          </ol>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="fine-print">학교 인증은 소속 확인 절차일 뿐 상대방의 안전이나 신뢰를 보장하지 않아요.</p>
      </section>

      <section className="form-card" aria-labelledby="guide-title">
        <h2 id="guide-title" className="form-title">만남 안내</h2>
        <ul className="guide-list">
          <li>
            <strong>첫 만남은 공개 장소에서</strong>
            <span>역 출구, 매표소 앞, 로비처럼 사람이 많은 곳에서 만나요. 그룹 만들기에서도 공개 장소만 입력하도록 안내해요.</span>
          </li>
          <li>
            <strong>활동 시간·예상 비용·해산 계획 사전 공개</strong>
            <span>모든 그룹은 시작·종료 시간, 1인 예상 비용(포함·별도), 해산 계획, 취소 기준을 공개해요.</span>
          </li>
          <li>
            <strong>추가 구매·뒤풀이·사진 촬영은 본인 선택</strong>
            <span>필수 추가 활동은 상세에 ‘필수’로 표시돼요. 표시되지 않은 추가 지출이나 촬영은 거절해도 괜찮아요.</span>
          </li>
          <li>
            <strong>불편하면 바로 신고·차단</strong>
            <span>차단하면 추천과 역매칭에서 즉시 제외돼요. 긴급한 위험은 112에 먼저 신고하세요.</span>
          </li>
          <li>
            <strong>개인정보는 천천히</strong>
            <span>프로필에 학교 이메일·전화번호·학번을 노출하지 않아요. 연락처 교환은 충분히 신뢰가 생긴 뒤에 해도 늦지 않아요.</span>
          </li>
        </ul>
        <Link to="/records" className="btn btn-outline">신고·차단 기록 보기</Link>
      </section>
    </div>
  );
}
