// 상태에서 계산하는 조회 함수. 화면의 모든 요약 숫자는 여기서 계산한다.
import type { AppState, Booking, ISODate, Measurement, Member, Membership, Staff } from './types';
import { getSession, sessionEnd, sessionStart, TRIAL_TOTAL, type Session } from './schedule';
import { diffDays, seoulDate } from '../lib/time';

export function findMember(state: AppState, id: string): Member | undefined {
  return state.members.find((m) => m.id === id);
}

export function findStaff(state: AppState, id: string): Staff | undefined {
  return state.staff.find((s) => s.id === id);
}

export function staffName(state: AppState, id: string | undefined): string {
  if (!id) return '-';
  return findStaff(state, id)?.name ?? '알 수 없음';
}

export function displayName(m: Pick<Member, 'name'> | undefined): string {
  return m ? `${m.name}(가상)` : '알 수 없는 회원';
}

export function membershipCovering(member: Member, date: ISODate): Membership | undefined {
  return member.memberships.find((ms) => ms.status !== 'cancelled' && ms.startDate <= date && date <= ms.endDate);
}

export function latestMembership(member: Member): Membership | undefined {
  return [...member.memberships].filter((m) => m.status !== 'cancelled').sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
}

export type MemberStatus =
  | { kind: 'paid'; membership: Membership; daysLeft: number }
  | { kind: 'paused'; membership: Membership }
  | { kind: 'upcoming'; membership: Membership }
  | { kind: 'expired'; membership: Membership }
  | { kind: 'trial'; used: number; reserved: number; remaining: number };

export function trialUsage(state: AppState, memberId: string, now: Date) {
  const mine = state.bookings.filter((b) => b.memberId === memberId && b.kind === 'trial');
  const used = mine.filter((b) => b.status === 'attended').length;
  const reserved = mine.filter((b) => {
    if (b.status !== 'booked') return false;
    const s = getSession(b.sessionId);
    return !!s && sessionEnd(s) > now;
  }).length;
  const member = findMember(state, memberId);
  const total = member?.trialTotal ?? TRIAL_TOTAL;
  return { used, reserved, total, remaining: Math.max(0, total - used - reserved) };
}

export function memberStatus(state: AppState, member: Member, now: Date): MemberStatus {
  const today = seoulDate(now);
  const cover = membershipCovering(member, today);
  if (cover?.status === 'active') return { kind: 'paid', membership: cover, daysLeft: diffDays(today, cover.endDate) };
  if (cover?.status === 'paused') return { kind: 'paused', membership: cover };
  const future = member.memberships.find((m) => m.status === 'active' && m.startDate > today);
  if (future) return { kind: 'upcoming', membership: future };
  const latest = latestMembership(member);
  if (latest) return { kind: 'expired', membership: latest };
  const t = trialUsage(state, member.id, now);
  return { kind: 'trial', used: t.used, reserved: t.reserved, remaining: t.remaining };
}

export const STATUS_LABEL: Record<MemberStatus['kind'], string> = {
  paid: '유료 회원 (무제한)',
  paused: '휴회 중',
  upcoming: '회원권 시작 전',
  expired: '회원권 만료',
  trial: '무료체험',
};

/** 정원을 차지하는 예약 (취소 제외) */
export function roster(state: AppState, sessionId: string): Booking[] {
  return state.bookings.filter((b) => b.sessionId === sessionId && b.status !== 'cancelled');
}

export function seatsLeft(state: AppState, session: Session): number {
  return Math.max(0, session.capacity - roster(state, session.id).length);
}

export function waitingList(state: AppState, sessionId: string) {
  return state.waitlist
    .filter((w) => w.sessionId === sessionId && (w.status === 'waiting' || w.status === 'offered'))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function upcomingBookings(state: AppState, memberId: string, now: Date) {
  return state.bookings
    .filter((b) => b.memberId === memberId && b.status === 'booked')
    .map((b) => ({ booking: b, session: getSession(b.sessionId)! }))
    .filter((x) => x.session && sessionEnd(x.session) > now)
    .sort((a, b) => sessionStart(a.session).getTime() - sessionStart(b.session).getTime());
}

export function memberMeasurements(state: AppState, memberId: string): Measurement[] {
  return state.measurements
    .filter((m) => m.memberId === memberId)
    .sort((a, b) => (a.measuredAt < b.measuredAt ? 1 : -1));
}

/** 회원에게 보이는 쉬운 설명: 공개된 경우에만 */
export function publicExplanation(m: Measurement | undefined): string | null {
  if (!m || m.explanation.status !== 'published') return null;
  return m.explanation.text;
}

/** 회원에게 공개된 피드백만 */
export function memberFeedback(state: AppState, memberId: string) {
  return state.feedback
    .filter((f) => f.memberId === memberId && f.status === 'published')
    .sort((a, b) => ((a.publishedAt ?? '') < (b.publishedAt ?? '') ? 1 : -1));
}

export function unreadNotifications(state: AppState, member: Member) {
  const p = member.prefs.notifications;
  return state.notifications
    .filter((n) => n.memberId === member.id && !n.read)
    .filter((n) => {
      if (n.type === 'feedback' || n.type === 'feedback_followup') return p.feedback;
      if (n.type === 'explanation' || n.type === 'measurement') return p.explanation;
      if (n.type === 'waitlist') return p.waitlist;
      if (n.type === 'inquiry') return p.inquiry;
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
