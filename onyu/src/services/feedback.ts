// 코치 피드백: 출석한 수업의 명단 회원에게만 작성. 공개해야 회원에게 보인다.
import type { AppState, Feedback, FeedbackResponse, Result } from '../domain/types';
import { getSession } from '../domain/schedule';
import { formatDate } from '../lib/time';
import { cleanText, fail, isStaff, notify, ok, uid } from './common';

export interface FeedbackInput {
  activity: string;
  didWell: string;
  nextAdjust: string;
}

export function saveFeedback(state: AppState, coachId: string, bookingId: string, input: FeedbackInput, publish: boolean, now: Date): Result<Feedback> {
  if (!isStaff(state, coachId, 'coach')) return fail('피드백은 코치 화면에서 작성해요.');
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b) return fail('예약 기록을 찾을 수 없어요.');
  const s = getSession(b.sessionId);
  if (!s || !s.coachIds.includes(coachId)) return fail('담당한 수업의 회원에게만 피드백을 작성할 수 있어요.');
  if (b.status !== 'attended') return fail('출석 처리된 회원에게만 피드백을 작성할 수 있어요.');
  const activity = cleanText(input.activity, 200);
  const didWell = cleanText(input.didWell, 300);
  const nextAdjust = cleanText(input.nextAdjust, 300);
  if (publish && (!activity || !didWell || !nextAdjust)) return fail('공개하려면 세 칸을 모두 적어 주세요.');
  if (!activity && !didWell && !nextAdjust) return fail('내용을 한 칸 이상 적어 주세요.');
  const t = now.toISOString();
  const existing = state.feedback.find((f) => f.bookingId === bookingId);
  const base: Feedback = existing ?? {
    id: uid('fb'),
    bookingId,
    sessionId: b.sessionId,
    memberId: b.memberId,
    coachId,
    activity: '',
    didWell: '',
    nextAdjust: '',
    status: 'draft',
    createdAt: t,
    updatedAt: t,
  };
  const wasPublished = base.status === 'published';
  const next: Feedback = {
    ...base,
    activity,
    didWell,
    nextAdjust,
    coachId,
    updatedAt: t,
    status: publish ? 'published' : 'draft',
    publishedAt: publish ? (wasPublished ? base.publishedAt : t) : base.publishedAt,
  };
  let state2: AppState = {
    ...state,
    feedback: existing ? state.feedback.map((f) => (f.id === existing.id ? next : f)) : [...state.feedback, next],
  };
  if (publish) {
    state2 = notify(
      state2,
      {
        memberId: b.memberId,
        type: 'feedback',
        title: wasPublished ? '코치 피드백이 수정됐어요' : '코치 피드백이 도착했어요',
        body: `${formatDate(s.date)} ${s.slot} ${s.program.title} 수업`,
        link: '/member/body#feedback',
      },
      now,
    );
  }
  return ok(state2, next, publish ? '피드백을 공개했어요. 회원 화면에 바로 표시돼요.' : '초안으로 저장했어요. 회원에게는 보이지 않아요.');
}

export function respondFeedback(state: AppState, memberId: string, feedbackId: string, response: FeedbackResponse, now: Date): Result {
  const f = state.feedback.find((x) => x.id === feedbackId);
  if (!f || f.memberId !== memberId || f.status !== 'published') return fail('피드백을 찾을 수 없어요.');
  const feedback = state.feedback.map((x) => (x.id === feedbackId ? { ...x, response, respondedAt: now.toISOString() } : x));
  return ok(
    { ...state, feedback },
    undefined,
    response === 'understood' ? '“이해했어요”를 코치에게 전달했어요.' : '“설명이 더 필요해요”를 코치와 매니저에게 전달했어요.',
  );
}

export function followUpFeedback(state: AppState, staffId: string, feedbackId: string, text: string, now: Date): Result {
  if (!isStaff(state, staffId)) return fail('운영진만 추가 설명을 남길 수 있어요.');
  const f = state.feedback.find((x) => x.id === feedbackId);
  if (!f || f.status !== 'published') return fail('공개된 피드백에만 추가 설명을 남길 수 있어요.');
  const body = cleanText(text, 300);
  if (!body) return fail('추가 설명을 적어 주세요.');
  const feedback = state.feedback.map((x) => (x.id === feedbackId ? { ...x, followUp: { text: body, by: staffId, at: now.toISOString() } } : x));
  const next = notify(
    { ...state, feedback },
    { memberId: f.memberId, type: 'feedback_followup', title: '요청하신 추가 설명이 도착했어요', body: '코치 피드백 아래에서 확인해 주세요.', link: '/member/body#feedback' },
    now,
  );
  return ok(next, undefined, '추가 설명을 회원에게 전달했어요.');
}
