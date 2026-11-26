// 체성분 측정 결과 수신 어댑터.
// 실제 연동 흐름: 회원 동의 → 기기 측정 → (서버) InBody Connect/API 또는 LookinBody Web API로 결과 수신
// → 회원 식별 확인 → 원본 결과 반영 → 매니저 설명 공개.
// 지원 장비·API 계약·접근 키·가격은 확인이 필요한 항목이며, 현재 체결된 협업은 없다.
// API 키는 반드시 서버에서만 다룬다. 프런트엔드는 우리 서버의 수신 결과만 조회해야 한다.
import type { AppState, BodyValues } from '../domain/types';
import { memberMeasurements } from '../domain/selectors';

export interface MeasurementPayload {
  externalId: string;
  memberId: string;
  measuredAt: string;
  device: string;
  source: 'demo' | 'inbody';
  values: BodyValues;
}

export interface BodyCompositionSource {
  readonly name: string;
  /** 새 측정 결과 한 건을 받아온다 */
  receive(state: AppState, memberId: string, now: Date): MeasurementPayload;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 시연용: 직전 기록을 바탕으로 작은 변화를 준 결과를 만든다. 실제 기기 값이 아니다. */
export const demoInBodySource: BodyCompositionSource = {
  name: '시연용 수신기 (실제 인바디 아님)',
  receive(state, memberId, now) {
    const seq = state.demo.eventSeq + 1;
    const prev = memberMeasurements(state, memberId)[0]?.values;
    const wiggle = [0.3, -0.2, 0.4, 0.1, -0.1][seq % 5];
    const base: BodyValues = prev ?? {
      weight: 62,
      skeletalMuscle: 23.5,
      bodyFatMass: 18.6,
      bodyFatPercent: 30,
      bmi: 24.2,
      totalBodyWater: 31.5,
      protein: 8.5,
      mineral: 3.1,
    };
    const weight = r1(base.weight + wiggle * 0.5);
    const skeletalMuscle = r1(base.skeletalMuscle + wiggle * 0.6);
    const bodyFatMass = r1(base.bodyFatMass - wiggle * 0.4);
    return {
      externalId: `demo-evt-${memberId}-${seq}`,
      memberId,
      measuredAt: now.toISOString(),
      device: '시연용 체성분 측정 기록',
      source: 'demo',
      values: {
        weight,
        skeletalMuscle,
        bodyFatMass,
        bodyFatPercent: r1((bodyFatMass / weight) * 100),
        bmi: r1((base.bmi * weight) / base.weight),
        totalBodyWater: r1(base.totalBodyWater + wiggle * 0.4),
        protein: r1(base.protein + wiggle * 0.1),
        mineral: base.mineral,
      },
    };
  },
};
