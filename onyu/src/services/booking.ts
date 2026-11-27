// 예약·대기·취소·컨디션·출석 규칙. 모든 함수는 (state, …, now) → Result 형태의 순수 함수다.
import type { AppState, Booking, BookingKind, ConditionLevel, Result, WaitEntry } from '../domain/types';
import { BOOKING_WINDOW_DAYS, getSession, sessionEnd, sessionStart, type Session } from '../domain/schedule';
import { findMember, membershipCovering, roster, seatsLeft, trialUsage } from '../domain/selectors';
import { addDays, diffDays, formatDate, seoulDate } from '../lib/time';
import { cleanText, fail, isStaff, notify, ok, uid } from './common';

export type BookCheck =
  | { ok: true; session: Session; kind: BookingKind }
  | { ok: false; code: 'invalid' | 'past' | 'window' | 'duplicate' | 'ineligible' | 'full'; error: string; session?: Session };

/** 예약 가능 날짜 범위: 오늘 ~ 오늘+7일 */
export function bookingWindow(now: Date) {
  const today = seoulDate(now);
  return { from: today, to: addDays(today, BOOKING_WINDOW_DAYS) };
}

function eligibility(state: AppState, memberId: string, date: string, now: Date): { ok: true; kind: BookingKind } | { ok: false; error: string } {
  const member = findMember(state, memberId);
  if (!member) return { ok: false, error: '회원 정보를 찾을 수 없어요.' };
  const cover = membershipCovering(member, date);
  if (cover?.status === 'active') return { ok: true, kind: 'paid' };
  if (cover?.status === 'paused') return { ok: false, error: '이 날짜는 회원권 휴회 기간이에요. 온유 담당자에게 휴회 해제를 요청해 주세요.' };
  if (member.memberships.some((m) => m.status !== 'cancelled')) {
    return { ok: false, error: '이 날짜에 유효한 회원권이 없어요. 회원권 연장은 온유 담당자에게 문의해 주세요.' };
  }
  const t = trialUsage(state, memberId, now);
  if (t.remaining > 0) return { ok: true, kind: 'trial' };
  return { ok: false, error: `무료체험 ${t.total}회를 모두 사용했거나 예약했어요. 회원권 안내는 온유 담당자에게 문의해 주세요.` };
}

export function checkBooking(state: AppState, memberId: string, sessionId: string, now: Date): BookCheck {
  const session = getSession(sessionId);
  if (!session) return { ok: false, code: 'invalid', error: '운영하지 않는 날짜·시간이에요. 평일 수업만 예약할 수 있어요.' };
  if (sessionStart(session) <= now) return { ok: false, code: 'past', error: '이미 시작했거나 지난 수업이라 예약할 수 없어요.', session };
  const today = seoulDate(now);
  if (diffDays(today, session.date) > BOOKING_WINDOW_DAYS) {
    return { ok: false, code: 'window', error: `수업 7일 전부터 예약할 수 있어요. ${formatDate(addDays(session.date, -BOOKING_WINDOW_DAYS))}부터 가능해요.`, session };
  }
  if (state.bookings.some((b) => b.sessionId === sessionId && b.memberId === memberId && b.status === 'booked')) {
    return { ok: false, code: 'duplicate', error: '이미 예약한 수업이에요.', session };
  }
  const el = eligibility(state, memberId, session.date, now);
  if (!el.ok) return { ok: false, code: 'ineligible', error: el.error, session };
  if (seatsLeft(state, session) <= 0) return { ok: false, code: 'full', error: '정원 6명이 모두 찼어요. 대기 신청을 할 수 있어요.', session };
  return { ok: true, session, kind: el.kind };
}

export function book(state: AppState, memberId: string, sessionId: string, now: Date): Result<Booking> {
  const c = checkBooking(state, memberId, sessionId, now);
  if (!c.ok) return fail(c.error);
  const booking: Booking = { id: uid('bk'), sessionId, memberId, status: 'booked', kind: c.kind, createdAt: now.toISOString() };
  const waitlist = state.waitlist.map((w) =>
    w.sessionId === sessionId && w.memberId === memberId && (w.status === 'waiting' || w.status === 'offered')
      ? { ...w, status: 'confirmed' as const, resolvedAt: now.toISOString() }
      : w,
  );
  return ok({ ...state, bookings: [...state.bookings, booking], waitlist }, booking, '예약이 완료됐어요.');
}

export function joinWaitlist(state: AppState, memberId: string, sessionId: string, now: Date): Result<WaitEntry> {
  const c = checkBooking(state, memberId, sessionId, now);
  if (c.ok) return fail('아직 자리가 있어요. 바로 예약할 수 있어요.');
  if (c.code !== 'full') return fail(c.error);
  if (state.waitlist.some((w) => w.sessionId === sessionId && w.memberId === memberId && (w.status === 'waiting' || w.status === 'offered'))) {
    return fail('이미 대기 신청한 수업이에요.');
  }
  const entry: WaitEntry = { id: uid('wt'), sessionId, memberId, status: 'waiting', createdAt: now.toISOString() };
  return ok({ ...state, waitlist: [...state.waitlist, entry] }, entry, '대기 신청이 완료됐어요. 자리가 생기면 앱에서 알려드려요.');
}

export function cancelWait(state: AppState, memberId: string, waitId: string, now: Date): Result {
  const w = state.waitlist.find((x) => x.id === waitId);
  if (!w || w.memberId !== memberId) return fail('대기 신청을 찾을 수 없어요.');
  if (w.status !== 'waiting' && w.status !== 'offered') return fail('이미 종료된 대기 신청이에요.');
  const waitlist = state.waitlist.map((x) => (x.id === waitId ? { ...x, status: 'cancelled' as const, resolvedAt: now.toISOString() } : x));
  return ok({ ...state, waitlist }, undefined, '대기 신청을 취소했어요.');
}

/** 자리가 생기면 유효한 대기자에게 앱 내 알림을 보낸다. 예약을 자동 확정하지 않는다. */
export function offerSeats(state: AppState, sessionId: string, now: Date): AppState {
  const session = getSession(sessionId);
  if (!session || sessionStart(session) <= now || seatsLeft(state, session) <= 0) return state;
  let next = state;
  for (const w of state.waitlist) {
    if (w.sessionId !== sessionId || w.status !== 'waiting') continue;
    const el = eligibility(next, w.memberId, session.date, now);
    if (!el.ok) continue;
    next = {
      ...next,
      waitlist: next.waitlist.map((x) => (x.id === w.id ? { ...x, status: 'offered' as const, offeredAt: now.toISOString() } : x)),
    };
    next = notify(
      next,
      {
        memberId: w.memberId,
        type: 'waitlist',
        title: '대기하신 수업에 자리가 생겼어요',
        body: `${formatDate(session.date)} ${session.slot} ${session.program.title}. 아직 예약이 확정된 것은 아니에요. [예약 확정하기]를 눌러 주세요.`,
        link: '/member/me#bookings',
      },
      now,
    );
  }
  return next;
}

export function cancelBooking(state: AppState, memberId: string, bookingId: string, now: Date): Result {
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b || b.memberId !== memberId) return fail('예약을 찾을 수 없어요.');
  if (b.status !== 'booked') return fail('취소할 수 있는 예약이 아니에요.');
  const s = getSession(b.sessionId);
  if (!s || sessionStart(s) <= now) return fail('이미 시작한 수업은 앱에서 취소할 수 없어요. 온유 담당자에게 알려 주세요.');
  let next: AppState = {
    ...state,
    bookings: state.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'cancelled' as const, cancelledAt: now.toISOString() } : x)),
  };
  next = offerSeats(next, b.sessionId, now);
  return ok(next, undefined, '예약을 취소했어요.');
}

/** 대기자가 알림을 보고 예약을 확정. 그 사이 정원이 찼으면 다시 대기 상태로 둔다. */
export function confirmOffer(state: AppState, memberId: string, waitId: string, now: Date): Result<{ booked: boolean; booking?: Booking }> {
  const w = state.waitlist.find((x) => x.id === waitId);
  if (!w || w.memberId !== memberId) return fail('대기 신청을 찾을 수 없어요.');
  if (w.status !== 'offered') return fail('예약 확정 안내를 받은 대기가 아니에요.');
  const c = checkBooking(state, memberId, w.sessionId, now);
  if (!c.ok) {
    if (c.code === 'full') {
      const waitlist = state.waitlist.map((x) => (x.id === waitId ? { ...x, status: 'waiting' as const, offeredAt: undefined } : x));
      return ok({ ...state, waitlist }, { booked: false }, '그 사이 다른 분이 먼저 예약해 자리가 다시 찼어요. 대기 순서는 그대로 유지돼요.');
    }
    const waitlist = state.waitlist.map((x) => (x.id === waitId ? { ...x, status: 'cancelled' as const, resolvedAt: now.toISOString() } : x));
    return ok({ ...state, waitlist }, { booked: false }, c.error);
  }
  const r = book(state, memberId, w.sessionId, now);
  if (!r.ok) return r;
  return ok(r.state, { booked: true, booking: r.value }, '대기하던 수업의 예약이 확정됐어요.');
}

export const CONDITION_LABEL: Record<ConditionLevel, string> = {
  good: '좋아요',
  tired: '조금 피곤해요',
  discomfort: '불편한 곳이 있어요',
};
export const CONDITION_TAGS = ['잠을 설쳤어요', '무릎', '허리', '어깨', '손목', '혈압약 복용', '식사를 못 했어요'];

export function setCondition(
  state: AppState,
  memberId: string,
  bookingId: string,
  input: { level: ConditionLevel; tags: string[]; memo: string },
  now: Date,
): Result {
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b || b.memberId !== memberId || b.status !== 'booked') return fail('컨디션을 입력할 수 있는 예약이 아니에요.');
  const s = getSession(b.sessionId);
  if (!s || sessionEnd(s) <= now) return fail('이미 끝난 수업이에요.');
  if (!CONDITION_LABEL[input.level]) return fail('컨디션을 선택해 주세요.');
  const tags = input.tags.filter((t) => CONDITION_TAGS.includes(t));
  const condition = { level: input.level, tags, memo: cleanText(input.memo, 80), at: now.toISOString() };
  const bookings = state.bookings.map((x) => (x.id === bookingId ? { ...x, condition } : x));
  return ok({ ...state, bookings }, undefined, '컨디션을 전달했어요. 온유 운영진이 수업 전에 확인해요.');
}

export function ackCondition(state: AppState, staffId: string, bookingId: string, now: Date): Result {
  if (!isStaff(state, staffId)) return fail('운영진만 확인할 수 있어요.');
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b?.condition) return fail('확인할 컨디션 정보가 없어요.');
  const bookings = state.bookings.map((x) =>
    x.id === bookingId && x.condition ? { ...x, condition: { ...x.condition, checkedBy: staffId, checkedAt: now.toISOString() } } : x,
  );
  return ok({ ...state, bookings }, undefined, '컨디션 확인을 기록했어요.');
}

/** 출석 처리는 매니저만. 수업 당일 또는 지난 수업만 처리할 수 있다. */
export function markAttendance(state: AppState, staffId: string, bookingId: string, status: 'attended' | 'absent' | 'booked', now: Date): Result {
  if (!isStaff(state, staffId, 'manager')) return fail('출석 처리는 매니저 화면에서 할 수 있어요.');
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b || b.status === 'cancelled') return fail('출석을 처리할 예약이 아니에요.');
  const s = getSession(b.sessionId);
  if (!s) return fail('수업 정보를 찾을 수 없어요.');
  if (s.date > seoulDate(now)) return fail('아직 수업 날짜가 아니에요. 수업 당일부터 출석을 처리할 수 있어요.');
  if (status !== 'attended' && state.feedback.some((f) => f.bookingId === bookingId)) {
    return fail('이 출석에는 코치 피드백이 작성되어 있어 되돌릴 수 없어요.');
  }
  if (status === 'attended' && b.kind === 'trial' && b.status !== 'attended') {
    const t = trialUsage(state, b.memberId, now);
    if (t.used >= t.total) return fail('무료체험 2회를 이미 모두 사용한 회원이에요.');
  }
  const bookings = state.bookings.map((x) =>
    x.id === bookingId
      ? { ...x, status, attendanceBy: status === 'booked' ? undefined : staffId, attendanceAt: status === 'booked' ? undefined : now.toISOString() }
      : x,
  );
  const msg = status === 'attended' ? '출석으로 기록했어요.' : status === 'absent' ? '결석으로 기록했어요.' : '출석 처리를 되돌렸어요.';
  return ok({ ...state, bookings }, undefined, msg);
}

export function sessionSummary(state: AppState, session: Session) {
  const r = roster(state, session.id);
  return {
    booked: r.length,
    left: Math.max(0, session.capacity - r.length),
    trial: r.filter((b) => b.kind === 'trial').length,
    attended: r.filter((b) => b.status === 'attended').length,
    absent: r.filter((b) => b.status === 'absent').length,
    waiting: state.waitlist.filter((w) => w.sessionId === session.id && (w.status === 'waiting' || w.status === 'offered')).length,
    conditions: r.filter((b) => b.condition).length,
    unchecked: r.filter((b) => b.condition && !b.condition.checkedBy).length,
  };
}
