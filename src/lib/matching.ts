import { AXES } from '../data/axes';
import { CATEGORY_MAP, type ConditionField } from '../data/categories';
import { formatWon, timeSlotOf } from './date';
import type {
  AppState,
  Block,
  CategoryId,
  ConditionMap,
  ConditionValue,
  Group,
  Person,
  Profile,
  Traits,
} from './types';
import { ME } from './types';

/** 성향 근접도 = 100 − 5개 성향 값의 절대 차이 평균 */
export function proximity(a: Traits, b: Traits): number {
  const diff = a.reduce<number>((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
  return Math.round(100 - diff);
}

export function remainingSeats(group: Group): number {
  return Math.max(0, group.capacity - group.memberIds.length);
}

/* ---------------------------------- 조건 비교 ---------------------------------- */

function asArray(v: ConditionValue | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function fieldMatches(field: ConditionField, a: ConditionValue | undefined, b: ConditionValue | undefined): boolean {
  const av = asArray(a);
  const bv = asArray(b);
  // 아직 입력하지 않은 조건은 제한하지 않는다
  if (av.length === 0 || bv.length === 0) return true;
  if (field.anyValue && (av.includes(field.anyValue) || bv.includes(field.anyValue))) return true;
  return av.some((x) => bv.includes(x));
}

/** 필수 조건 중 맞지 않는 항목의 라벨 목록 */
export function unmetRequiredConditions(
  category: CategoryId,
  groupConditions: ConditionMap,
  personConditions: ConditionMap | undefined,
): string[] {
  const fields = CATEGORY_MAP[category].fields.filter((f) => f.match === 'required');
  return fields
    .filter((f) => !fieldMatches(f, groupConditions[f.key], personConditions?.[f.key]))
    .map((f) => f.label);
}

/* ---------------------------------- 차단 ---------------------------------- */

export function isMemberBlocked(blocks: Block[], personId: string): boolean {
  return blocks.some((b) => b.targetType === 'member' && b.targetId === personId);
}

export function isGroupBlocked(blocks: Block[], group: Group): boolean {
  return blocks.some(
    (b) =>
      (b.targetType === 'group' && b.targetId === group.id) ||
      (b.targetType === 'member' && b.targetId === group.hostId),
  );
}

/* ---------------------------------- 그룹 필터 ---------------------------------- */

export type ExclusionReason = 'category' | 'date' | 'time' | 'budget' | 'full' | 'conditions' | 'blocked' | 'past';

export interface GroupEligibility {
  eligible: boolean;
  reasons: ExclusionReason[];
}

export function checkGroupForProfile(
  group: Group,
  profile: Profile,
  blocks: Block[],
  today: string,
): GroupEligibility {
  const reasons: ExclusionReason[] = [];
  if (group.date < today) reasons.push('past');
  if (!profile.interests.includes(group.category)) reasons.push('category');
  if (!profile.dates.includes(group.date)) reasons.push('date');
  else if (!profile.timeSlots.includes(timeSlotOf(group.startTime))) reasons.push('time');
  if (group.cost.total > profile.budgetMax) reasons.push('budget');
  if (remainingSeats(group) <= 0) reasons.push('full');
  if (unmetRequiredConditions(group.category, group.conditions, profile.conditions[group.category]).length > 0)
    reasons.push('conditions');
  if (isGroupBlocked(blocks, group)) reasons.push('blocked');
  return { eligible: reasons.length === 0, reasons };
}

export interface Recommendation {
  group: Group;
  score: number;
  reasons: string[];
}

export interface RecommendationResult {
  items: Recommendation[];
  /** 결과가 없을 때 안내용: 관심 활동 그룹이 제외된 이유별 개수 */
  exclusionCounts: Partial<Record<ExclusionReason, number>>;
}

export function recommendGroups(
  groups: Group[],
  profile: Profile,
  traits: Traits,
  blocks: Block[],
  today: string,
  excludeHostId: string = ME,
): RecommendationResult {
  const items: Recommendation[] = [];
  const exclusionCounts: Partial<Record<ExclusionReason, number>> = {};
  for (const group of groups) {
    if (group.hostId === excludeHostId || group.memberIds.includes(excludeHostId)) continue;
    const { eligible, reasons } = checkGroupForProfile(group, profile, blocks, today);
    if (eligible) {
      items.push({ group, score: proximity(traits, group.prefs), reasons: recommendationReasons(traits, group) });
    } else if (!reasons.includes('category') && !reasons.includes('blocked') && !reasons.includes('past')) {
      for (const r of reasons) exclusionCounts[r] = (exclusionCounts[r] ?? 0) + 1;
    }
  }
  return { items: sortByScore(items), exclusionCounts };
}

/** 점수 내림차순, 같으면 날짜·시간 빠른 순, 그다음 id 순 */
export function sortByScore<T extends { score: number; group: Group }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      b.score - a.score ||
      (a.group.date + a.group.startTime).localeCompare(b.group.date + b.group.startTime) ||
      a.group.id.localeCompare(b.group.id),
  );
}

/* ---------------------------------- 추천 이유 ---------------------------------- */

export interface AxisComparison {
  name: string;
  user: number;
  group: number;
  diff: number;
  userLabel: string;
  groupLabel: string;
}

export function compareAxes(user: Traits, group: Traits): AxisComparison[] {
  return AXES.map((axis, i) => ({
    name: axis.name,
    user: user[i],
    group: group[i],
    diff: Math.abs(user[i] - group[i]),
    userLabel: axis.options.find((o) => o.value === user[i])!.label,
    groupLabel: axis.groupStyle[group[i]],
  }));
}

export function recommendationReasons(user: Traits, group: Group): string[] {
  const similar = AXES.flatMap((axis, i) => (user[i] === group.prefs[i] ? [axis.similar[group.prefs[i]]] : []));
  return [...similar.slice(0, 2), `선택한 날짜와 예산 조건에 맞아요. (1인 예상 ${formatWon(group.cost.total)})`];
}

/** 성향 차이가 큰 축 (차이 50 이상) */
export function differences(user: Traits, group: Traits): AxisComparison[] {
  return compareAxes(user, group).filter((c) => c.diff >= 50);
}

export const EXCLUSION_TIPS: Record<ExclusionReason, string> = {
  category: '관심 활동을 더 선택해 보세요.',
  date: '가능한 날짜를 더 선택해 보세요.',
  time: '가능한 시간대(오전·오후·저녁)를 넓혀 보세요.',
  budget: '예산 상한을 조금 올려 보세요.',
  full: '모집이 끝난 그룹이 있어요. 새 그룹을 직접 만들어 보세요.',
  conditions: '활동별 조건 중 일부를 "상관없음"으로 바꿔 보세요.',
  blocked: '차단한 그룹·회원의 그룹은 보이지 않아요.',
  past: '지난 일정은 표시되지 않아요.',
};

/* ---------------------------------- 둘러보기 필터 ---------------------------------- */

export interface ExploreFilter {
  category: CategoryId | 'all';
  date: string | 'all';
  budgetMax: number | null;
  onlyOpen: boolean;
}

export function filterExplore(groups: Group[], filter: ExploreFilter, blocks: Block[], today: string): Group[] {
  return groups
    .filter((g) => g.date >= today)
    .filter((g) => filter.category === 'all' || g.category === filter.category)
    .filter((g) => filter.date === 'all' || g.date === filter.date)
    .filter((g) => filter.budgetMax === null || g.cost.total <= filter.budgetMax)
    .filter((g) => !filter.onlyOpen || remainingSeats(g) > 0)
    .filter((g) => !isGroupBlocked(blocks, g));
}

/* ---------------------------------- 역매칭 후보 ---------------------------------- */

export interface Candidate {
  person: Person;
  score: number;
}

export interface CandidateResult {
  candidates: Candidate[];
}

/**
 * 역매칭 후보: 공개 동의 + 관심 활동 + 날짜·시간 + 예산 + 필수 조건 + 차단 아님 +
 * 이미 멤버·대기 중·수락·거절한 초대 아님(취소된 초대는 다시 가능). 성향 근접도 순 정렬.
 */
export function findCandidates(group: Group, people: Person[], state: AppState, actingHostId: string): CandidateResult {
  const slot = timeSlotOf(group.startTime);
  const busy = new Set(
    state.invitations
      .filter((inv) => inv.groupId === group.id && inv.status !== 'cancelled')
      .map((inv) => inv.participantId),
  );
  const candidates = people
    .filter((p) => p.reverseOptIn)
    .filter((p) => p.id !== actingHostId && p.id !== group.hostId)
    .filter((p) => !group.memberIds.includes(p.id))
    .filter((p) => !busy.has(p.id))
    .filter((p) => !isMemberBlocked(state.blocks, p.id))
    .filter((p) => p.interests.includes(group.category))
    .filter((p) => p.dates.includes(group.date) && p.timeSlots.includes(slot))
    .filter((p) => p.budgetMax >= group.cost.total)
    .filter((p) => unmetRequiredConditions(group.category, group.conditions, p.conditions[group.category]).length === 0)
    .map((person) => ({ person, score: proximity(person.traits, group.prefs) }))
    .sort((a, b) => b.score - a.score || a.person.id.localeCompare(b.person.id));
  return { candidates };
}
