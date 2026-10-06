import { useId } from 'react';
import { setReverseOptIn } from '../lib/actions';
import { useStore } from '../store';

/** 역매칭 프로필 공개 동의. 명시적으로 체크해야만 후보가 된다. */
export function OptInCard() {
  const { state, update, toast } = useStore();
  const id = useId();
  const descId = useId();
  return (
    <section className="optin-card" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`}>역매칭 프로필 공개</h2>
      <p id={descId}>
        동의하면 호스트가 그룹과 조건이 맞는 참여자를 찾을 때 내 프로필이 후보로 보일 수 있어요. 공개되는 정보는 <strong>별명, 나이대,
        관심 활동, 가능한 날짜·시간대, 예산 상한, 활동별 조건, 동행 선호 5개 축</strong>뿐이에요. 학교 이메일·전화번호·학번은 공개하지
        않아요. 언제든 철회할 수 있고, 철회하면 대기 중인 초대는 취소돼요.
      </p>
      <label className="switch-row">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={state.reverseOptIn}
          aria-describedby={descId}
          onChange={(e) => {
            const v = e.target.checked;
            update((s) => setReverseOptIn(s, v));
            toast(v ? '역매칭 프로필 공개에 동의했어요.' : '역매칭 공개 동의를 철회했어요.');
          }}
        />
        <span className="switch" aria-hidden="true" />
        <span>{state.reverseOptIn ? '공개 동의함' : '공개하지 않음 (기본값)'}</span>
      </label>
      <p className="fine-print">시제품에서는 이 동의가 다른 사용자에게 전송되지 않으며, 같은 브라우저의 호스트 화면 시연에만 쓰여요.</p>
    </section>
  );
}
