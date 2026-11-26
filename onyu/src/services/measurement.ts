// 측정 결과 저장과 매니저 설명 관리.
// 측정값(자동 수신) / 매니저 설명(검토 후 공개) / 코치 지도 내용을 분리해 저장한다.
import type { AppState, BodyValues, Measurement, Result } from '../domain/types';
import type { BodyCompositionSource, MeasurementPayload } from '../adapters/inbody';
import { findMember, memberMeasurements } from '../domain/selectors';
import { formatDate, seoulDate } from '../lib/time';
import { cleanText, fail, isStaff, notify, ok, uid } from './common';

const RANGES: Record<keyof BodyValues, [number, number]> = {
  weight: [25, 200],
  skeletalMuscle: [5, 80],
  bodyFatMass: [1, 120],
  bodyFatPercent: [2, 75],
  bmi: [10, 60],
  totalBodyWater: [10, 90],
  protein: [2, 30],
  mineral: [0.5, 10],
};

/** 미리 작성된 문구로 설명 초안을 만든다 (외부 AI 호출 없음). 매니저가 검토·수정 후 공개한다. */
export function buildDraft(curr: BodyValues, prev?: { values: BodyValues; measuredAt: string }): string {
  if (!prev) {
    return '첫 측정 결과예요. 오늘 값은 앞으로 변화를 비교하는 기준이 돼요. 기초 체력 측정과 함께 보면서 수업 강도를 정할게요.';
  }
  const d = Math.round((curr.skeletalMuscle - prev.values.skeletalMuscle) * 10) / 10;
  const date = formatDate(seoulDate(new Date(prev.measuredAt)));
  const muscle =
    d === 0
      ? `골격근량은 ${date} 측정과 같아요.`
      : `골격근량이 ${date} 측정보다 ${Math.abs(d)}kg ${d > 0 ? '늘었어요' : '줄었어요'}.`;
  return `${muscle} 측정 전 수분·식사·시간에 따라 값이 조금씩 달라질 수 있어 한 번의 변화만으로 좋아졌다거나 나빠졌다고 보지는 않아요. 다음 측정과 수업 중 움직임을 함께 살펴볼게요.`;
}

export function receiveMeasurement(state: AppState, payload: MeasurementPayload, now: Date): Result<Measurement> {
  const member = findMember(state, payload.memberId);
  if (!member) return fail('회원 식별에 실패했어요. 결과를 저장하지 않았어요.');
  const dup = state.measurements.find((m) => m.externalId === payload.externalId);
  if (dup) return fail(`이미 저장된 측정 결과예요 (중복 수신 · 기록 ID ${dup.id}). 다시 저장하지 않았어요.`);
  for (const [k, [lo, hi]] of Object.entries(RANGES) as [keyof BodyValues, [number, number]][]) {
    const v = payload.values[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) return fail(`측정값(${k})이 올바르지 않아 저장하지 않았어요.`);
  }
  const prev = memberMeasurements(state, payload.memberId)[0];
  const m: Measurement = {
    id: uid('ms'),
    externalId: payload.externalId,
    memberId: payload.memberId,
    measuredAt: payload.measuredAt,
    receivedAt: now.toISOString(),
    source: payload.source,
    device: payload.device,
    values: payload.values,
    explanation: { status: 'pending', text: buildDraft(payload.values, prev), coachNote: '' },
  };
  const next = notify(
    { ...state, measurements: [...state.measurements, m] },
    {
      memberId: payload.memberId,
      type: 'measurement',
      title: '새 측정 결과가 들어왔어요',
      body: '측정 기록은 바로 볼 수 있어요. 쉬운 설명은 매니저가 확인한 뒤 알려드려요.',
      link: '/member/body',
    },
    now,
  );
  return ok(next, m, '새 측정 결과를 저장했어요. 상태: 설명 확인 전');
}

/** 시연: 어댑터에서 결과를 받아 저장한다. 시연 이벤트 번호를 올린다. */
export function simulateReceive(state: AppState, source: BodyCompositionSource, memberId: string, now: Date): Result<Measurement> {
  const payload = source.receive(state, memberId, now);
  const r = receiveMeasurement(state, payload, now);
  if (!r.ok) return r;
  return ok({ ...r.state, demo: { ...r.state.demo, eventSeq: r.state.demo.eventSeq + 1, lastDemoEventId: payload.externalId } }, r.value, r.message);
}

/** 시연: 직전 이벤트를 같은 ID로 다시 보내 중복 저장이 막히는지 확인한다. */
export function resendLast(state: AppState, now: Date): Result<Measurement> {
  const id = state.demo.lastDemoEventId;
  const m = state.measurements.find((x) => x.externalId === id);
  if (!id || !m) return fail('다시 보낼 시연 수신 기록이 없어요. 먼저 새 측정 결과 수신을 시연해 주세요.');
  return receiveMeasurement(
    state,
    { externalId: m.externalId, memberId: m.memberId, measuredAt: m.measuredAt, device: m.device, source: m.source, values: m.values },
    now,
  );
}

export function saveExplanation(
  state: AppState,
  managerId: string,
  measurementId: string,
  input: { text: string; coachNote: string },
  publish: boolean,
  now: Date,
): Result {
  if (!isStaff(state, managerId, 'manager')) return fail('설명 검토·공개는 매니저가 해요.');
  const m = state.measurements.find((x) => x.id === measurementId);
  if (!m) return fail('측정 기록을 찾을 수 없어요.');
  const text = cleanText(input.text, 500);
  const coachNote = cleanText(input.coachNote, 300);
  if (publish && text.length < 10) return fail('회원에게 공개할 설명을 10자 이상 적어 주세요.');
  const wasPublished = m.explanation.status === 'published';
  const t = now.toISOString();
  const measurements = state.measurements.map((x) =>
    x.id === measurementId
      ? {
          ...x,
          explanation: {
            status: publish ? ('published' as const) : ('draft' as const),
            text,
            coachNote,
            updatedBy: managerId,
            updatedAt: t,
            publishedAt: publish ? t : undefined,
          },
        }
      : x,
  );
  let next: AppState = { ...state, measurements };
  if (publish) {
    next = notify(
      next,
      {
        memberId: m.memberId,
        type: 'explanation',
        title: wasPublished ? '측정 결과 설명이 수정됐어요' : '측정 결과 쉬운 설명이 도착했어요',
        body: '매니저가 확인한 설명을 내 몸 알아보기에서 읽어 보세요.',
        link: '/member/body',
      },
      now,
    );
  }
  return ok(
    next,
    undefined,
    publish ? '설명을 공개했어요. 회원 알림과 쉬운 설명 카드에 반영됐어요.' : wasPublished ? '초안으로 되돌렸어요. 회원에게는 숨겨져요.' : '초안을 저장했어요. 회원에게는 아직 보이지 않아요.',
  );
}
