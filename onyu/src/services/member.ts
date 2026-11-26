// 회원권·상담 기록·운동 방향·식사 확인·문의·알림·설정
import type { AppState, DietCheck, InquiryCategory, Member, Membership, PlanType, Result } from '../domain/types';
import { PLAN_INFO } from '../domain/schedule';
import { findMember } from '../domain/selectors';
import { addDays, addMonths, formatDate } from '../lib/time';
import { cleanText, fail, isStaff, notify, ok, uid } from './common';

function updateMember(state: AppState, memberId: string, fn: (m: Member) => Member): AppState {
  return { ...state, members: state.members.map((m) => (m.id === memberId ? fn(m) : m)) };
}

function log(m: Member, by: string, action: string, detail: string, now: Date): Member {
  return { ...m, membershipLog: [{ id: uid('lg'), at: now.toISOString(), by, action, detail }, ...m.membershipLog] };
}

const MANAGER_ONLY = '회원권 관리는 매니저만 할 수 있어요.';

export function addMembership(state: AppState, managerId: string, memberId: string, plan: PlanType, startDate: string, now: Date): Result<Membership> {
  if (!isStaff(state, managerId, 'manager')) return fail(MANAGER_ONLY);
  const member = findMember(state, memberId);
  if (!member) return fail('회원을 찾을 수 없어요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return fail('시작일을 선택해 주세요.');
  const endDate = addDays(addMonths(startDate, PLAN_INFO[plan].months), -1);
  const overlap = member.memberships.find((x) => x.status !== 'cancelled' && x.startDate <= endDate && startDate <= x.endDate);
  if (overlap) return fail(`기존 회원권(${formatDate(overlap.startDate)}~${formatDate(overlap.endDate)})과 기간이 겹쳐요. 기존 회원권 종료일 다음 날부터 시작해 주세요.`);
  const ms: Membership = { id: uid('ms'), plan, startDate, endDate, status: 'active', price: PLAN_INFO[plan].price, createdAt: now.toISOString() };
  const next = updateMember(state, memberId, (m) =>
    log({ ...m, memberships: [...m.memberships, ms] }, managerId, '회원권 등록', `${PLAN_INFO[plan].label} ${startDate} ~ ${endDate}`, now),
  );
  return ok(next, ms, '회원권을 등록했어요. 이전 기록은 그대로 남아 있어요.');
}

export function setMembershipStatus(state: AppState, managerId: string, memberId: string, membershipId: string, status: 'active' | 'paused', now: Date): Result {
  if (!isStaff(state, managerId, 'manager')) return fail(MANAGER_ONLY);
  const member = findMember(state, memberId);
  const ms = member?.memberships.find((x) => x.id === membershipId);
  if (!member || !ms) return fail('회원권을 찾을 수 없어요.');
  if (ms.status === status) return fail('이미 같은 상태예요.');
  const next = updateMember(state, memberId, (m) =>
    log(
      { ...m, memberships: m.memberships.map((x) => (x.id === membershipId ? { ...x, status } : x)) },
      managerId,
      status === 'paused' ? '휴회 처리' : '휴회 해제',
      `${PLAN_INFO[ms.plan].label} (${ms.startDate} ~ ${ms.endDate})`,
      now,
    ),
  );
  return ok(next, undefined, status === 'paused' ? '휴회로 바꿨어요.' : '휴회를 해제했어요.');
}

export function changeEndDate(state: AppState, managerId: string, memberId: string, membershipId: string, endDate: string, now: Date): Result {
  if (!isStaff(state, managerId, 'manager')) return fail(MANAGER_ONLY);
  const member = findMember(state, memberId);
  const ms = member?.memberships.find((x) => x.id === membershipId);
  if (!member || !ms) return fail('회원권을 찾을 수 없어요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < ms.startDate) return fail('종료일은 시작일 이후로 선택해 주세요.');
  const next = updateMember(state, memberId, (m) =>
    log(
      { ...m, memberships: m.memberships.map((x) => (x.id === membershipId ? { ...x, endDate } : x)) },
      managerId,
      '종료일 변경',
      `${ms.endDate} → ${endDate}`,
      now,
    ),
  );
  return ok(next, undefined, '종료일을 바꿨어요. 변경 이력이 남았어요.');
}

export function addCareNote(state: AppState, staffId: string, memberId: string, kind: 'consult' | 'adjust', text: string, now: Date): Result {
  if (!isStaff(state, staffId, 'manager')) return fail('상담·운동 조정 기록은 매니저가 남겨요.');
  const body = cleanText(text, 300);
  if (!body) return fail('기록할 내용을 적어 주세요.');
  if (!findMember(state, memberId)) return fail('회원을 찾을 수 없어요.');
  const next = updateMember(state, memberId, (m) => ({ ...m, careNotes: [{ id: uid('cn'), at: now.toISOString(), by: staffId, kind, text: body }, ...m.careNotes] }));
  return ok(next, undefined, '기록을 저장했어요.');
}

export function setPrecautions(state: AppState, staffId: string, memberId: string, lines: string[]): Result {
  if (!isStaff(state, staffId, 'manager')) return fail('주의사항은 매니저가 관리해요.');
  const precautions = lines.map((l) => cleanText(l, 120)).filter(Boolean).slice(0, 6);
  return ok(updateMember(state, memberId, (m) => ({ ...m, precautions })), undefined, '주의사항을 저장했어요. 코치 수업 화면에 반영돼요.');
}

export function setExercisePlan(state: AppState, staffId: string, memberId: string, text: string, now: Date): Result {
  if (!isStaff(state, staffId)) return fail('운동 방향은 지도자가 작성해요.');
  const body = cleanText(text, 400);
  if (body.length < 5) return fail('운동 방향을 5자 이상 적어 주세요.');
  return ok(updateMember(state, memberId, (m) => ({ ...m, exercisePlan: { text: body, by: staffId, updatedAt: now.toISOString() } })), undefined, '운동 방향을 저장했어요. 회원 화면에 바로 보여요.');
}

export function saveDietCheck(state: AppState, memberId: string, input: Omit<DietCheck, 'updatedAt'>, now: Date): Result {
  if (!findMember(state, memberId)) return fail('회원을 찾을 수 없어요.');
  return ok(updateMember(state, memberId, (m) => ({ ...m, dietCheck: { ...input, updatedAt: now.toISOString() } })), undefined, '답변을 저장했어요. 상담 때 함께 살펴봐요.');
}

export const INQUIRY_LABEL: Record<InquiryCategory, string> = {
  booking: '예약',
  membership: '회원권',
  body: '측정 결과',
  mall: '제휴몰',
  diet: '식사 상담',
  other: '기타',
};

export function createInquiry(state: AppState, memberId: string, category: InquiryCategory, message: string, now: Date): Result {
  if (!findMember(state, memberId)) return fail('회원을 찾을 수 없어요.');
  if (!INQUIRY_LABEL[category]) return fail('문의 종류를 선택해 주세요.');
  const body = cleanText(message, 500);
  if (body.length < 2) return fail('도움이 필요한 내용을 적어 주세요.');
  const inquiry = { id: uid('iq'), memberId, category, message: body, createdAt: now.toISOString(), status: 'open' as const };
  return ok({ ...state, inquiries: [inquiry, ...state.inquiries] }, undefined, '도움 요청을 보냈어요. 매니저가 답변하면 알려드려요.');
}

export function answerInquiry(state: AppState, managerId: string, inquiryId: string, answer: string, now: Date): Result {
  if (!isStaff(state, managerId, 'manager')) return fail('문의 답변은 매니저가 해요.');
  const q = state.inquiries.find((x) => x.id === inquiryId);
  if (!q) return fail('문의를 찾을 수 없어요.');
  const body = cleanText(answer, 500);
  if (body.length < 2) return fail('답변을 적어 주세요.');
  const inquiries = state.inquiries.map((x) =>
    x.id === inquiryId ? { ...x, status: 'answered' as const, answer: body, answeredBy: managerId, answeredAt: now.toISOString() } : x,
  );
  const next = notify(
    { ...state, inquiries },
    { memberId: q.memberId, type: 'inquiry', title: '문의에 답변이 왔어요', body: `${INQUIRY_LABEL[q.category]} 문의`, link: '/member/me#inquiries' },
    now,
  );
  return ok(next, undefined, '답변을 보냈어요. 회원 화면에 표시돼요.');
}

export function updatePrefs(state: AppState, memberId: string, patch: Partial<Member['prefs']>): Result {
  if (!findMember(state, memberId)) return fail('회원을 찾을 수 없어요.');
  return ok(updateMember(state, memberId, (m) => ({ ...m, prefs: { ...m.prefs, ...patch, notifications: { ...m.prefs.notifications, ...(patch.notifications ?? {}) } } })), undefined, '설정을 저장했어요.');
}

export function markNotificationsRead(state: AppState, memberId: string, ids?: string[]): Result {
  const notifications = state.notifications.map((n) => (n.memberId === memberId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n));
  return ok({ ...state, notifications }, undefined);
}
