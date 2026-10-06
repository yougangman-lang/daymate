/**
 * 상태 전이 함수 모음. 모두 순수 함수이며 새 상태 또는 오류 메시지를 돌려준다.
 * UI와 단위 테스트가 같은 규칙을 사용한다.
 */
import { CATEGORY_MAP } from '../data/categories';
import { isValidISODate } from './date';
import { isGroupBlocked, isMemberBlocked, remainingSeats } from './matching';
import type {
  AppState,
  AxisValue,
  Block,
  CategoryId,
  ConditionMap,
  DraftAnswers,
  Group,
  Invitation,
  Person,
  Profile,
  Report,
  ReportTargetType,
  Traits,
} from './types';
import { ME } from './types';

export type Result = { ok: true; state: AppState } | { ok: false; error: string };

const ok = (state: AppState): Result => ({ ok: true, state });
const fail = (error: string): Result => ({ ok: false, error });

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export const LIMITS = {
  nickname: 12,
  inviteMessage: 300,
  joinMessage: 200,
  reportDetail: 500,
  groupTitle: 40,
  groupDescription: 400,
  groupPlace: 40,
  groupMeeting: 60,
  groupText: 120,
  maxCost: 300000,
} as const;

/** 앞뒤 공백 제거 + 제어 문자 제거 + 길이 제한. 출력은 항상 React 텍스트로만 렌더링한다. */
export function cleanText(input: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

/* ---------------------------------- 그룹 목록 ---------------------------------- */

/** 시드 그룹 + 생성한 그룹에 역매칭 수락 멤버를 반영한 전체 그룹 */
export function allGroups(state: AppState, seedGroups: Group[]): Group[] {
  return [...state.createdGroups, ...seedGroups].map((g) => {
    const added = state.acceptedMembers[g.id] ?? [];
    return added.length ? { ...g, memberIds: [...g.memberIds, ...added.filter((id) => !g.memberIds.includes(id))] } : g;
  });
}

export function findGroup(groups: Group[], id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

/** 현재 사용자의 역매칭 프로필 (동의·테스트 완료 시에만 후보가 될 수 있다) */
export function mePerson(state: AppState): Person | null {
  if (!state.test.result) return null;
  return {
    id: ME,
    nickname: state.profile.nickname || '나',
    ageRange: state.profile.ageRange || '비공개',
    schoolName: '비공개',
    verification: 'none',
    bio: '내 동행 선호 프로필',
    interests: state.profile.interests,
    dates: state.profile.dates,
    timeSlots: state.profile.timeSlots,
    budgetMax: state.profile.budgetMax,
    conditions: state.profile.conditions,
    traits: state.test.result,
    reverseOptIn: state.reverseOptIn,
    avatarHue: 250,
  };
}

/** 그룹의 호스트 역할을 할 수 있는지 (내 그룹 또는 시연용 그룹) */
export function canHost(group: Group): boolean {
  return group.hostId === ME || group.demoHostable === true;
}

/* ---------------------------------- 프로필·테스트 ---------------------------------- */

export function updateProfile(state: AppState, patch: Partial<Profile>): AppState {
  const profile = { ...state.profile, ...patch };
  if (patch.nickname !== undefined) profile.nickname = cleanText(patch.nickname, LIMITS.nickname);
  return { ...state, profile };
}

export function setCondition(state: AppState, category: CategoryId, key: string, value: string | string[]): AppState {
  const current: ConditionMap = { ...(state.profile.conditions[category] ?? {}) };
  if (Array.isArray(value) && value.length === 0) delete current[key];
  else current[key] = value;
  return { ...state, profile: { ...state.profile, conditions: { ...state.profile.conditions, [category]: current } } };
}

export function answerQuestion(state: AppState, index: number, value: AxisValue): AppState {
  if (index < 0 || index > 4) return state;
  const draft = [...state.test.draft] as DraftAnswers;
  draft[index] = value;
  return { ...state, test: { ...state.test, draft } };
}

export function isDraftComplete(draft: DraftAnswers): draft is Traits {
  return draft.every((v) => v === 0 || v === 50 || v === 100);
}

/** 5문항을 모두 답해야 결과를 확정한다. */
export function completeTest(state: AppState, now = new Date()): Result {
  const { draft } = state.test;
  if (!isDraftComplete(draft)) {
    const left = draft.filter((v) => v === null).length;
    return fail(`아직 답하지 않은 문항이 ${left}개 있어요.`);
  }
  return ok({ ...state, test: { draft: [...draft] as DraftAnswers, result: [...draft] as Traits, completedAt: now.toISOString() } });
}

/** 결과 수정: 확정된 답을 초안으로 불러온다 (다시 완료해야 새 결과로 반영) */
export function startEditTest(state: AppState): AppState {
  if (!state.test.result) return state;
  return { ...state, test: { ...state.test, draft: [...state.test.result] as DraftAnswers } };
}

export function setReverseOptIn(state: AppState, value: boolean): AppState {
  // 동의를 철회하면 나에게 온 대기 중 초대는 더 이상 유지하지 않는다
  const invitations = value
    ? state.invitations
    : state.invitations.map((inv) =>
        inv.participantId === ME && inv.status === 'pending' ? { ...inv, status: 'cancelled' as const, updatedAt: new Date().toISOString() } : inv,
      );
  return { ...state, reverseOptIn: value, invitations };
}

/* ---------------------------------- 저장·참여 요청 ---------------------------------- */

export function toggleSave(state: AppState, groupId: string): AppState {
  const saved = state.savedGroupIds.includes(groupId)
    ? state.savedGroupIds.filter((id) => id !== groupId)
    : [...state.savedGroupIds, groupId];
  return { ...state, savedGroupIds: saved };
}

export function activeJoinRequest(state: AppState, groupId: string) {
  return state.joinRequests.find((r) => r.groupId === groupId && r.status === 'pending');
}

export function requestJoin(state: AppState, group: Group, message: string, now = new Date()): Result {
  if (group.hostId === ME) return fail('내가 만든 그룹이에요.');
  if (group.memberIds.includes(ME)) return fail('이미 참여 중인 그룹이에요.');
  if (isGroupBlocked(state.blocks, group)) return fail('차단한 그룹이나 호스트에게는 요청할 수 없어요.');
  if (remainingSeats(group) <= 0) return fail('모집이 마감된 그룹이에요.');
  if (activeJoinRequest(state, group.id)) return fail('이미 참여 요청을 보냈어요.');
  const req = { groupId: group.id, message: cleanText(message, LIMITS.joinMessage), status: 'pending' as const, createdAt: now.toISOString() };
  return ok({ ...state, joinRequests: [...state.joinRequests.filter((r) => r.groupId !== group.id), req] });
}

export function cancelJoin(state: AppState, groupId: string): AppState {
  return {
    ...state,
    joinRequests: state.joinRequests.map((r) => (r.groupId === groupId && r.status === 'pending' ? { ...r, status: 'cancelled' } : r)),
  };
}

/* ---------------------------------- 역매칭 초대 ---------------------------------- */

export interface InviteInput {
  groupId: string;
  participantId: string;
  message: string;
}

export function sendInvite(state: AppState, groups: Group[], people: Person[], input: InviteInput, now = new Date()): Result {
  const group = findGroup(groups, input.groupId);
  if (!group) return fail('그룹을 찾을 수 없어요.');
  if (!canHost(group)) return fail('호스트로 관리할 수 있는 그룹이 아니에요.');
  const person = people.find((p) => p.id === input.participantId);
  if (!person) return fail('참여자를 찾을 수 없어요.');
  if (!person.reverseOptIn) return fail('역매칭 공개에 동의하지 않은 참여자예요.');
  if (person.id === group.hostId) return fail('호스트 본인은 초대할 수 없어요.');
  if (isMemberBlocked(state.blocks, person.id) || isMemberBlocked(state.blocks, group.hostId))
    return fail('차단 관계에서는 초대할 수 없어요.');
  if (person.id === ME && isGroupBlocked(state.blocks, group)) return fail('차단 관계에서는 초대할 수 없어요.');
  if (group.memberIds.includes(person.id)) return fail('이미 참여 중인 멤버예요.');
  const existing = state.invitations.find((inv) => inv.groupId === group.id && inv.participantId === person.id && inv.status !== 'cancelled');
  if (existing?.status === 'pending') return fail('이미 초대를 보냈어요. 응답을 기다리는 중이에요.');
  if (existing?.status === 'accepted') return fail('이미 초대를 수락한 참여자예요.');
  if (existing?.status === 'declined') return fail('초대를 거절한 참여자에게는 다시 보낼 수 없어요.');
  if (remainingSeats(group) <= 0) return fail('정원이 모두 찼어요.');
  const message = cleanText(input.message, LIMITS.inviteMessage);
  if (message.length < 2) return fail('초대 메시지를 2자 이상 입력해 주세요.');
  const ts = now.toISOString();
  const invitation: Invitation = {
    id: newId('inv'),
    groupId: group.id,
    hostId: group.hostId,
    participantId: person.id,
    message,
    status: 'pending',
    createdAt: ts,
    updatedAt: ts,
  };
  return ok({ ...state, invitations: [...state.invitations, invitation] });
}

function updateInvitation(state: AppState, id: string, patch: Partial<Invitation>): AppState {
  return { ...state, invitations: state.invitations.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)) };
}

export function cancelInvite(state: AppState, id: string, now = new Date()): Result {
  const inv = state.invitations.find((i) => i.id === id);
  if (!inv) return fail('초대를 찾을 수 없어요.');
  if (inv.status !== 'pending') return fail('대기 중인 초대만 취소할 수 있어요.');
  return ok(updateInvitation(state, id, { status: 'cancelled', updatedAt: now.toISOString() }));
}

export function respondInvite(state: AppState, groups: Group[], id: string, answer: 'accept' | 'decline', now = new Date()): Result {
  const inv = state.invitations.find((i) => i.id === id);
  if (!inv) return fail('초대를 찾을 수 없어요.');
  if (inv.status !== 'pending') return fail('이미 처리된 초대예요.');
  const ts = now.toISOString();
  if (answer === 'decline') return ok(updateInvitation(state, id, { status: 'declined', updatedAt: ts }));

  const group = findGroup(groups, inv.groupId);
  if (!group) return fail('그룹을 찾을 수 없어요.');
  if (isMemberBlocked(state.blocks, inv.hostId) || isMemberBlocked(state.blocks, inv.participantId) || (inv.participantId === ME && isGroupBlocked(state.blocks, group)))
    return fail('차단 관계에서는 수락할 수 없어요.');
  if (group.memberIds.includes(inv.participantId)) return fail('이미 참여 중이에요.');
  if (remainingSeats(group) <= 0) return fail('정원이 모두 차서 수락할 수 없어요.');
  const added = [...(state.acceptedMembers[group.id] ?? []), inv.participantId];
  const next = updateInvitation(state, id, { status: 'accepted', updatedAt: ts });
  return ok({ ...next, acceptedMembers: { ...next.acceptedMembers, [group.id]: added } });
}

/* ---------------------------------- 신고·차단 ---------------------------------- */

export const REPORT_REASONS = [
  '허위 정보나 사칭이 의심돼요',
  '불쾌한 언행·괴롭힘',
  '금전 요구·영리 목적 홍보',
  '공개 장소가 아닌 곳에서 만남 요구',
  '노쇼·반복적인 일정 무시',
  '기타',
] as const;

export function addReport(
  state: AppState,
  input: { targetType: ReportTargetType; targetId: string; targetLabel: string; reason: string; detail: string },
  now = new Date(),
): Result {
  if (!(REPORT_REASONS as readonly string[]).includes(input.reason)) return fail('신고 사유를 선택해 주세요.');
  const detail = cleanText(input.detail, LIMITS.reportDetail);
  if (input.reason === '기타' && detail.length < 5) return fail('기타 사유는 5자 이상 설명해 주세요.');
  const report: Report = {
    id: newId('rep'),
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: cleanText(input.targetLabel, 60),
    reason: input.reason,
    detail,
    createdAt: now.toISOString(),
  };
  return ok({ ...state, reports: [report, ...state.reports] });
}

export function isBlocked(state: AppState, targetType: ReportTargetType, targetId: string): boolean {
  return state.blocks.some((b) => b.targetType === targetType && b.targetId === targetId);
}

export function addBlock(state: AppState, targetType: ReportTargetType, targetId: string, targetLabel: string, now = new Date()): AppState {
  if (targetId === ME || isBlocked(state, targetType, targetId)) return state;
  const block: Block = { targetType, targetId, targetLabel: cleanText(targetLabel, 60), createdAt: now.toISOString() };
  const ts = now.toISOString();
  // 차단 즉시 관련된 대기 중 초대·참여 요청을 정리한다
  const invitations = state.invitations.map((inv) => {
    if (inv.status !== 'pending') return inv;
    const related =
      targetType === 'member'
        ? inv.participantId === targetId || inv.hostId === targetId
        : inv.groupId === targetId && inv.participantId === ME;
    return related ? { ...inv, status: 'cancelled' as const, updatedAt: ts } : inv;
  });
  return { ...state, blocks: [block, ...state.blocks], invitations };
}

export function removeBlock(state: AppState, targetType: ReportTargetType, targetId: string): AppState {
  return { ...state, blocks: state.blocks.filter((b) => !(b.targetType === targetType && b.targetId === targetId)) };
}

/* ---------------------------------- 그룹 만들기 ---------------------------------- */

export interface GroupInput {
  category: CategoryId;
  title: string;
  description: string;
  place: string;
  meetingPoint: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  costTotal: number;
  included: string;
  separate: string;
  prefs: Traits;
  conditions: ConditionMap;
  route: string;
  extras: { label: string; required: boolean }[];
  dismissPlan: string;
  cancelPolicy: string;
}

export type GroupErrors = Partial<Record<keyof GroupInput | string, string>>;

const splitList = (s: string, max: number) =>
  s
    .split(/[,\n]/)
    .map((x) => cleanText(x, LIMITS.groupText))
    .filter(Boolean)
    .slice(0, max);

export function validateGroupInput(input: GroupInput, today: string): GroupErrors {
  const e: GroupErrors = {};
  const title = cleanText(input.title, 200);
  if (title.length < 4) e.title = '제목을 4자 이상 입력해 주세요.';
  else if (title.length > LIMITS.groupTitle) e.title = `제목은 ${LIMITS.groupTitle}자 이내로 입력해 주세요.`;
  if (cleanText(input.description, 1000).length < 10) e.description = '활동 설명을 10자 이상 입력해 주세요.';
  if (cleanText(input.place, 100).length < 2) e.place = '활동 장소를 입력해 주세요.';
  if (cleanText(input.meetingPoint, 100).length < 2) e.meetingPoint = '공개된 첫 만남 장소를 입력해 주세요.';
  if (!isValidISODate(input.date)) e.date = '날짜를 선택해 주세요.';
  else if (input.date < today) e.date = '오늘 이후 날짜를 선택해 주세요.';
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) e.startTime = '시작 시간을 입력해 주세요.';
  if (!/^\d{2}:\d{2}$/.test(input.endTime)) e.endTime = '종료 시간을 입력해 주세요.';
  else if (input.startTime >= input.endTime) e.endTime = '종료 시간은 시작 시간보다 늦어야 해요.';
  if (!Number.isInteger(input.capacity) || input.capacity < 2 || input.capacity > 6) e.capacity = '정원은 호스트 포함 2~6명이에요.';
  if (!Number.isFinite(input.costTotal) || input.costTotal < 0 || input.costTotal > LIMITS.maxCost)
    e.costTotal = `예상 비용은 0~${LIMITS.maxCost.toLocaleString('ko-KR')}원 사이로 입력해 주세요.`;
  for (const f of CATEGORY_MAP[input.category].fields) {
    if (f.match !== 'required') continue;
    const v = input.conditions[f.key];
    if (v === undefined || (Array.isArray(v) && v.length === 0)) e[`cond.${f.key}`] = `${f.label}을(를) 선택해 주세요.`;
  }
  if (cleanText(input.dismissPlan, 200).length < 2) e.dismissPlan = '해산 계획을 입력해 주세요.';
  if (cleanText(input.cancelPolicy, 200).length < 2) e.cancelPolicy = '취소 기준을 입력해 주세요.';
  return e;
}

export function createGroup(state: AppState, input: GroupInput, today: string, now = new Date()): Result & { errors?: GroupErrors; group?: Group } {
  const errors = validateGroupInput(input, today);
  if (Object.keys(errors).length) return { ok: false, error: '입력 내용을 확인해 주세요.', errors };
  const routeLines = input.route
    .split('\n')
    .map((l) => cleanText(l, LIMITS.groupText))
    .filter(Boolean)
    .slice(0, 8);
  const group: Group = {
    id: newId('u'),
    category: input.category,
    title: cleanText(input.title, LIMITS.groupTitle),
    description: cleanText(input.description, LIMITS.groupDescription),
    hostId: ME,
    place: cleanText(input.place, LIMITS.groupPlace),
    meetingPoint: cleanText(input.meetingPoint, LIMITS.groupMeeting),
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    capacity: input.capacity,
    memberIds: [ME],
    cost: { total: Math.round(input.costTotal), included: splitList(input.included, 6), separate: splitList(input.separate, 6) },
    prefs: input.prefs,
    conditions: input.conditions,
    route: routeLines.length
      ? routeLines.map((label, i) => ({ time: i === 0 ? input.startTime : i === routeLines.length - 1 ? input.endTime : '', label }))
      : [
          { time: input.startTime, label: '첫 만남 장소에서 만나기' },
          { time: input.endTime, label: '해산' },
        ],
    extras: input.extras
      .map((x) => ({ label: cleanText(x.label, 40), required: x.required }))
      .filter((x) => x.label)
      .slice(0, 5),
    dismissPlan: cleanText(input.dismissPlan, 200),
    cancelPolicy: cleanText(input.cancelPolicy, 200),
    isSeed: false,
    createdAt: now.toISOString(),
  };
  return { ok: true, state: { ...state, createdGroups: [group, ...state.createdGroups] }, group };
}

export function deleteCreatedGroup(state: AppState, groupId: string): AppState {
  return {
    ...state,
    createdGroups: state.createdGroups.filter((g) => g.id !== groupId),
    invitations: state.invitations.map((inv) =>
      inv.groupId === groupId && inv.status === 'pending' ? { ...inv, status: 'cancelled' as const } : inv,
    ),
  };
}
