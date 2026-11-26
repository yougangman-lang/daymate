// 운영진 화면 요약 수치 – 모두 저장된 데이터에서 계산한다.
import type { AppState } from '../../domain/types';
import { getSession, sessionStart, sessionsOn } from '../../domain/schedule';
import { addDays, seoulDate } from '../../lib/time';
import { useAppState, useNow } from '../../store/store';

export function coachTodo(state: AppState, coachId: string, now: Date) {
  const today = seoulDate(now);
  const from = addDays(today, -14);
  const writeNeeded = state.bookings.filter((b) => {
    if (b.status !== 'attended') return false;
    const s = getSession(b.sessionId);
    if (!s || !s.coachIds.includes(coachId) || s.date < from) return false;
    const f = state.feedback.find((x) => x.bookingId === b.id);
    return !f || f.status !== 'published';
  });
  const needMore = state.feedback.filter((f) => {
    const s = getSession(f.sessionId);
    return f.response === 'need_more' && !f.followUp && !!s && s.coachIds.includes(coachId);
  });
  return { writeNeeded, needMore };
}

export function opsSummary(state: AppState, now: Date) {
  const today = seoulDate(now);
  const todaySessions = sessionsOn(today);
  const activeToday = state.bookings.filter((b) => b.status !== 'cancelled' && todaySessions.some((s) => s.id === b.sessionId));
  const attendanceDue = activeToday.filter((b) => b.status === 'booked' && sessionStart(getSession(b.sessionId)!) <= now);
  const horizon = addDays(today, 7);
  const upcoming = state.bookings.filter((b) => {
    if (b.status !== 'booked') return false;
    const s = getSession(b.sessionId);
    return !!s && s.date >= today && s.date <= horizon;
  });
  const uncheckedConditions = upcoming.filter((b) => b.condition && !b.condition.checkedBy);
  const waiting = state.waitlist.filter((w) => {
    const s = getSession(w.sessionId);
    return (w.status === 'waiting' || w.status === 'offered') && !!s && sessionStart(s) > now;
  });
  const pendingMeasurements = state.measurements.filter((m) => m.explanation.status !== 'published');
  const openInquiries = state.inquiries.filter((q) => q.status === 'open');
  const needMore = state.feedback.filter((f) => f.response === 'need_more' && !f.followUp);
  return { today, todaySessions, activeToday, attendanceDue, uncheckedConditions, waiting, pendingMeasurements, openInquiries, needMore };
}

export function useStaffCounts() {
  const state = useAppState();
  const now = useNow();
  const o = opsSummary(state, now);
  const c = coachTodo(state, state.demo.coachId, now);
  return {
    pendingMeasurements: o.pendingMeasurements.length,
    needMore: o.needMore.length,
    openInquiries: o.openInquiries.length,
    coachTodo: c.writeNeeded.length + c.needMore.length,
  };
}
