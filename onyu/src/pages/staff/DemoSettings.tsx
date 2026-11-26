import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useNow, useStore } from '../../store/store';
import { displayName } from '../../domain/selectors';
import { formatDateTime, seoulDate, seoulTime } from '../../lib/time';
import { setClock, setDemo } from '../../services/demo';
import { ConfirmDialog, Notice, useRunner } from '../../components/ui';

export function DemoSettings() {
  const state = useAppState();
  const store = useStore();
  const now = useNow();
  const navigate = useNavigate();
  const { run, msg, setMsg } = useRunner();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(`${seoulDate(now)}T${seoulTime(now)}`);
  const real = new Date();
  return (
    <div className="stack-lg">
      <header className="page-head">
        <span className="eyebrow">시연 설정</span>
        <h1>발표 시연 도구</h1>
        <p>이 설정은 발표용 장치예요. 역할 전환은 실제 로그인·권한 보안이 아니에요.</p>
      </header>
      <Notice msg={msg} />
      <section className="panel stack">
        <h2>가상 회원 선택</h2>
        <label className="field">
          <span className="label">회원 화면에서 볼 가상 회원</span>
          <select className="select" value={state.demo.memberId} onChange={(e) => run((s) => setDemo(s, { memberId: e.target.value }))}>
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)} · {m.memberNo}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="panel stack">
        <h2>기준 시각 (Asia/Seoul)</h2>
        <dl className="kv">
          <dt>실제 현재 시각</dt>
          <dd>{formatDateTime(real.toISOString())}</dd>
          <dt>앱 기준 시각</dt>
          <dd>
            {formatDateTime(now.toISOString())} {state.demo.clockOffsetMs !== 0 && <span className="tag tag-warn">시연 보정 중</span>}
          </dd>
        </dl>
        <div className="row">
          <label className="field" style={{ flex: '1 1 16rem' }}>
            <span className="label">기준 시각 바꾸기</span>
            <input type="datetime-local" className="input" value={custom} onChange={(e) => setCustom(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const [d, t] = custom.split('T');
              if (!d || !t) return setMsg({ kind: 'error', text: '날짜와 시간을 선택해 주세요.' });
              run((s) => setClock(s, new Date(`${d}T${t.slice(0, 5)}:00+09:00`)));
            }}
          >
            이 시각으로 적용
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => run((s) => setClock(s, null))} disabled={state.demo.clockOffsetMs === 0}>
            실제 시각으로 되돌리기
          </button>
        </div>
        <p className="small muted">출석 처리처럼 수업 당일에만 가능한 동작을 발표 중에 보여줄 때 사용해요. 일정·과거 기록은 앱을 처음 실행한 날짜를 기준으로 만들어져요.</p>
      </section>
      <section className="panel stack">
        <h2>시연 데이터 초기화</h2>
        <p>예약·출석·측정·피드백·쿠폰·문의를 발표 시작 상태로 되돌려요. 오늘 날짜 기준으로 다시 만들어요.</p>
        <p className="small muted">데이터는 이 브라우저의 localStorage에만 있어요. 다른 기기와 공유되지 않아요.</p>
        <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
          시연 초기화
        </button>
      </section>
      <section className="panel stack">
        <h2>운영진 구성 (운영계획)</h2>
        <ul className="plain-list small">
          {state.staff.map((s) => (
            <li key={s.id}>
              {s.kind === 'manager' ? '공동운영 매니저' : '계약 코치'} {s.name}
              {s.kind === 'coach' && '(가상 인물)'} · {s.plannedQualification}
            </li>
          ))}
        </ul>
        <p className="tiny muted">자격은 운영계획상의 요구 조건이며, 앱이 실제 자격 보유를 확인·인증한 것이 아니에요.</p>
      </section>
      <ConfirmDialog
        open={open}
        title="시연 데이터를 초기화할까요?"
        body="지금까지 시연하며 만든 예약·출석·측정·피드백·쿠폰·문의가 모두 지워지고 발표 시작 상태로 돌아가요."
        confirmLabel="네, 초기화할게요"
        danger
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const r = store.reset();
          if (r.ok) {
            setMsg({ kind: 'ok', title: '초기화 완료', text: r.message ?? '' });
            navigate('/staff/demo');
          } else setMsg({ kind: 'error', text: r.error });
        }}
      />
    </div>
  );
}
