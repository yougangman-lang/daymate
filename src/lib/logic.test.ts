import { describe, expect, it } from 'vitest';
import { buildSeed } from '../data/seed';
import {
  addBlock,
  addReport,
  allGroups,
  answerQuestion,
  cancelInvite,
  cleanText,
  completeTest,
  createGroup,
  mePerson,
  removeBlock,
  requestJoin,
  respondInvite,
  sendInvite,
  setReverseOptIn,
  startEditTest,
  type GroupInput,
} from './actions';
import { addDays } from './date';
import {
  checkGroupForProfile,
  filterExplore,
  findCandidates,
  proximity,
  recommendGroups,
  recommendationReasons,
} from './matching';
import { defaultState, normalizeState } from './storage';
import type { AppState, AxisValue, Traits } from './types';
import { ME } from './types';

const TODAY = '2026-10-06';
const seed = buildSeed(TODAY);

function expectOk(r: { ok: boolean; error?: string; state?: AppState }): AppState {
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.state!;
}

function withAnswers(state: AppState, values: AxisValue[]): AppState {
  return values.reduce((s, v, i) => answerQuestion(s, i, v), state);
}

describe('시드 데이터', () => {
  it('예시 그룹 12개 이상, 예시 참여자 10명 이상', () => {
    expect(seed.groups.length).toBeGreaterThanOrEqual(12);
    expect(seed.people.length).toBeGreaterThanOrEqual(10);
  });
  it('모든 예시 그룹은 오늘 이후이며 정원 이하', () => {
    for (const g of seed.groups) {
      expect(g.date >= TODAY).toBe(true);
      expect(g.memberIds.length).toBeLessThanOrEqual(g.capacity);
      expect(seed.people.some((p) => p.id === g.hostId)).toBe(true);
    }
  });
  it('8개 활동 카테고리를 모두 포함한다', () => {
    expect(new Set(seed.groups.map((g) => g.category)).size).toBe(8);
  });
});

describe('성향 근접도', () => {
  it('100 − 절대 차이 평균', () => {
    expect(proximity([0, 0, 0, 0, 0], [0, 0, 0, 0, 0])).toBe(100);
    expect(proximity([0, 0, 0, 0, 0], [100, 100, 100, 100, 100])).toBe(0);
    // 차이 50,0,0,50,25? → 값은 0/50/100만: 차이 [50,0,0,50,100] 평균 40 → 60
    expect(proximity([0, 50, 50, 0, 0], [50, 50, 50, 50, 100])).toBe(60);
    // 차이 [50,0,0,0,0] 평균 10 → 90
    expect(proximity([0, 50, 50, 50, 50], [50, 50, 50, 50, 50])).toBe(90);
  });
});

describe('5문항 테스트', () => {
  it('5문항 완료 전에는 결과가 확정되지 않는다', () => {
    let s = withAnswers(defaultState(), [0, 50, 100, 50]);
    const r = completeTest(s);
    expect(r.ok).toBe(false);
    expect(s.test.result).toBeNull();
    s = answerQuestion(s, 4, 0);
    s = expectOk(completeTest(s));
    expect(s.test.result).toEqual([0, 50, 100, 50, 0]);
  });

  it('이전 문항 수정이 결과와 추천에 반영된다', () => {
    const profile = { ...defaultState().profile, interests: seed.groups.map((g) => g.category), dates: seed.groups.map((g) => g.date), timeSlots: ['morning', 'afternoon', 'evening'] as const, budgetMax: 300000 };
    let s: AppState = { ...defaultState(), profile: { ...profile, timeSlots: [...profile.timeSlots] } };
    s = expectOk(completeTest(withAnswers(s, [100, 100, 100, 100, 100])));
    const before = recommendGroups(seed.groups, s.profile, s.test.result!, [], TODAY);
    // 결과 수정: 1번 문항을 0으로 바꾸고 다시 완료
    s = startEditTest(s);
    s = answerQuestion(s, 0, 0);
    // 다시 완료하기 전엔 기존 결과 유지
    expect(s.test.result![0]).toBe(100);
    s = expectOk(completeTest(s));
    expect(s.test.result![0]).toBe(0);
    const after = recommendGroups(seed.groups, s.profile, s.test.result!, [], TODAY);
    const g = seed.groups.find((x) => x.prefs[0] === 0)!;
    const sBefore = before.items.find((i) => i.group.id === g.id);
    const sAfter = after.items.find((i) => i.group.id === g.id);
    if (sBefore && sAfter) expect(sAfter.score).toBeGreaterThan(sBefore.score);
  });
});

describe('추천 필터와 정렬', () => {
  const traits: Traits = [0, 50, 0, 50, 50];
  const baseProfile = {
    ...defaultState().profile,
    interests: ['exhibition', 'food', 'movie'] as AppState['profile']['interests'],
    dates: Array.from({ length: 14 }, (_, i) => addDays(TODAY, i + 1)),
    timeSlots: ['morning', 'afternoon', 'evening'] as AppState['profile']['timeSlots'],
    budgetMax: 30000,
  };

  it('관심 활동·날짜·예산·잔여 인원·필수 조건·차단을 모두 거른다', () => {
    const { items } = recommendGroups(seed.groups, baseProfile, traits, [], TODAY);
    for (const { group } of items) {
      expect(baseProfile.interests).toContain(group.category);
      expect(baseProfile.dates).toContain(group.date);
      expect(group.cost.total).toBeLessThanOrEqual(30000);
      expect(group.memberIds.length).toBeLessThan(group.capacity);
    }
    expect(items.length).toBeGreaterThan(0);
  });

  it('점수 내림차순으로 정렬되고 점수는 근접도 공식과 일치한다', () => {
    const { items } = recommendGroups(seed.groups, baseProfile, traits, [], TODAY);
    for (let i = 1; i < items.length; i++) expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    for (const it of items) expect(it.score).toBe(proximity(traits, it.group.prefs));
  });

  it('예산을 낮추면 비싼 그룹이 빠지고, 날짜를 빼면 해당 날짜 그룹이 빠진다', () => {
    const g10 = seed.groups.find((g) => g.id === 'g10')!; // 20,000원
    expect(checkGroupForProfile(g10, baseProfile, [], TODAY).eligible).toBe(true);
    expect(checkGroupForProfile(g10, { ...baseProfile, budgetMax: 10000 }, [], TODAY).reasons).toContain('budget');
    expect(
      checkGroupForProfile(g10, { ...baseProfile, dates: baseProfile.dates.filter((d) => d !== g10.date) }, [], TODAY).reasons,
    ).toContain('date');
    expect(checkGroupForProfile(g10, { ...baseProfile, timeSlots: ['morning'] }, [], TODAY).reasons).toContain('time');
  });

  it('활동별 필수 조건이 다르면 제외되고, "상관없음"이면 통과한다', () => {
    const g10 = seed.groups.find((g) => g.id === 'g10')!; // 성수·건대 디저트
    const mismatch = { ...baseProfile, conditions: { food: { menu: ['한식'], area: '성수·건대' } } };
    expect(checkGroupForProfile(g10, mismatch, [], TODAY).reasons).toContain('conditions');
    const any = { ...baseProfile, conditions: { food: { menu: ['디저트·카페'], area: '상관없음' } } };
    expect(checkGroupForProfile(g10, any, [], TODAY).eligible).toBe(true);
  });

  it('차단한 그룹·호스트의 그룹은 추천에서 제외된다', () => {
    const blocks = [{ targetType: 'member' as const, targetId: 'p06', targetLabel: '소금빵', createdAt: '' }];
    const { items } = recommendGroups(seed.groups, baseProfile, traits, blocks, TODAY);
    expect(items.some((i) => i.group.hostId === 'p06')).toBe(false);
  });

  it('결과가 없으면 제외 사유를 집계해 안내할 수 있다', () => {
    const r = recommendGroups(seed.groups, { ...baseProfile, budgetMax: 0 }, traits, [], TODAY);
    expect(r.items.length).toBe(0);
    expect(r.exclusionCounts.budget).toBeGreaterThan(0);
  });

  it('추천 이유에 날짜·예산 문구가 포함된다', () => {
    const g05 = seed.groups.find((g) => g.id === 'g05')!;
    const reasons = recommendationReasons([0, 50, 0, 50, 0], g05);
    expect(reasons).toContain('작은 그룹을 선호하는 점이 비슷해요.');
    expect(reasons.some((r) => r.startsWith('선택한 날짜와 예산 조건에 맞아요'))).toBe(true);
  });

  it('둘러보기 필터: 활동·날짜·예산', () => {
    const all = filterExplore(seed.groups, { category: 'all', date: 'all', budgetMax: null, onlyOpen: false }, [], TODAY);
    expect(all.length).toBe(seed.groups.length);
    const base = filterExplore(seed.groups, { category: 'baseball', date: 'all', budgetMax: null, onlyOpen: false }, [], TODAY);
    expect(base.every((g) => g.category === 'baseball')).toBe(true);
    const d = seed.groups[0].date;
    const byDate = filterExplore(seed.groups, { category: 'all', date: d, budgetMax: null, onlyOpen: false }, [], TODAY);
    expect(byDate.every((g) => g.date === d)).toBe(true);
    const cheap = filterExplore(seed.groups, { category: 'all', date: 'all', budgetMax: 15000, onlyOpen: false }, [], TODAY);
    expect(cheap.every((g) => g.cost.total <= 15000)).toBe(true);
    expect(cheap.length).toBeLessThan(all.length);
  });
});

describe('역매칭', () => {
  const groups = seed.groups;
  const g01 = groups.find((g) => g.id === 'g01')!; // 정원 3, 현재 2

  it('공개 동의하지 않은 참여자는 후보에서 제외된다', () => {
    const state = defaultState();
    const all = groups.flatMap((g) => findCandidates(g, seed.people, state, ME).candidates);
    expect(all.some((c) => !c.person.reverseOptIn)).toBe(false);
    expect(all.some((c) => c.person.id === 'p09' || c.person.id === 'p12')).toBe(false);
  });

  it('내 프로필도 동의해야만 후보가 된다', () => {
    let s = defaultState();
    s = { ...s, profile: { ...s.profile, interests: ['baseball'], dates: [g01.date], timeSlots: ['evening'], budgetMax: 50000 } };
    s = expectOk(completeTest(withAnswers(s, [0, 50, 50, 50, 50])));
    const people = () => [...seed.people, mePerson(s)!];
    expect(findCandidates(g01, people(), s, 'p01').candidates.some((c) => c.person.id === ME)).toBe(false);
    s = setReverseOptIn(s, true);
    expect(findCandidates(g01, people(), s, 'p01').candidates.some((c) => c.person.id === ME)).toBe(true);
  });

  it('후보는 성향 근접도 순이며 조건이 맞는 사람만 포함', () => {
    const { candidates } = findCandidates(g01, seed.people, defaultState(), ME);
    expect(candidates.map((c) => c.person.id)).toEqual(['p07', 'p14']);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[1].score);
  });

  it('중복 초대 방지, 수락 시 정원 반영, 초과 수락 차단', () => {
    let s = defaultState();
    s = expectOk(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '같이 가요!' }));
    const dup = sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '또 초대' });
    expect(dup.ok).toBe(false);
    s = expectOk(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p14', message: '처음이어도 환영' }));
    // 초대 후 후보 목록에서 빠진다
    expect(findCandidates(allGroups(s, groups).find((g) => g.id === 'g01')!, seed.people, s, ME).candidates.length).toBe(0);

    const [inv1, inv2] = s.invitations;
    s = expectOk(respondInvite(s, allGroups(s, groups), inv1.id, 'accept'));
    const g = allGroups(s, groups).find((x) => x.id === 'g01')!;
    expect(g.memberIds).toContain('p07');
    expect(g.memberIds.length).toBe(3);
    // 정원이 찼으므로 두 번째 수락은 막힌다
    const over = respondInvite(s, allGroups(s, groups), inv2.id, 'accept');
    expect(over.ok).toBe(false);
    expect(s.invitations.find((i) => i.id === inv2.id)!.status).toBe('pending');
    // 정원이 차면 새 초대도 막힌다
    const full = sendInvite(s, allGroups(s, groups), [...seed.people], { groupId: 'g01', participantId: 'p04', message: '안녕하세요' });
    expect(full.ok).toBe(false);
    // 같은 초대를 두 번 수락할 수 없다
    expect(respondInvite(s, allGroups(s, groups), inv1.id, 'accept').ok).toBe(false);
  });

  it('거절·취소 후 상태가 일관된다', () => {
    let s = defaultState();
    s = expectOk(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '같이 가요!' }));
    const id = s.invitations[0].id;
    s = expectOk(cancelInvite(s, id));
    expect(s.invitations[0].status).toBe('cancelled');
    // 취소된 초대는 수락할 수 없고 멤버도 늘지 않는다
    expect(respondInvite(s, allGroups(s, groups), id, 'accept').ok).toBe(false);
    expect(allGroups(s, groups).find((g) => g.id === 'g01')!.memberIds.length).toBe(2);
    // 취소 후에는 다시 초대할 수 있다
    s = expectOk(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '다시 초대해요' }));
    const id2 = s.invitations[1].id;
    s = expectOk(respondInvite(s, allGroups(s, groups), id2, 'decline'));
    expect(s.invitations[1].status).toBe('declined');
    expect(cancelInvite(s, id2).ok).toBe(false);
    // 거절한 참여자에게는 재초대 불가, 후보에서도 빠진다
    expect(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '한 번 더' }).ok).toBe(false);
    expect(findCandidates(g01, seed.people, s, ME).candidates.some((c) => c.person.id === 'p07')).toBe(false);
    expect(allGroups(s, groups).find((g) => g.id === 'g01')!.memberIds.length).toBe(2);
  });

  it('차단 관계에서는 추천·초대·수락이 막히고 해제 후 복구된다', () => {
    let s = defaultState();
    s = expectOk(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '같이 가요!' }));
    s = addBlock(s, 'member', 'p07', '오늘도직관');
    // 대기 중 초대는 자동 취소
    expect(s.invitations[0].status).toBe('cancelled');
    expect(findCandidates(g01, seed.people, s, ME).candidates.some((c) => c.person.id === 'p07')).toBe(false);
    expect(sendInvite(s, allGroups(s, groups), seed.people, { groupId: 'g01', participantId: 'p07', message: '같이 가요!' }).ok).toBe(false);
    s = removeBlock(s, 'member', 'p07');
    expect(s.blocks.length).toBe(0);
    expect(findCandidates(g01, seed.people, s, ME).candidates.some((c) => c.person.id === 'p07')).toBe(true);
  });

  it('호스트가 아닌 그룹으로는 초대할 수 없다', () => {
    const r = sendInvite(defaultState(), groups, seed.people, { groupId: 'g02', participantId: 'p14', message: '안녕하세요' });
    expect(r.ok).toBe(false);
  });
});

describe('신고·차단·참여 요청', () => {
  it('신고는 사유가 필수이고 기록에 남는다', () => {
    const s = defaultState();
    expect(addReport(s, { targetType: 'group', targetId: 'g01', targetLabel: 'x', reason: '', detail: '' }).ok).toBe(false);
    expect(addReport(s, { targetType: 'group', targetId: 'g01', targetLabel: 'x', reason: '기타', detail: '' }).ok).toBe(false);
    const s2 = expectOk(addReport(s, { targetType: 'group', targetId: 'g01', targetLabel: 'x', reason: '불쾌한 언행·괴롭힘', detail: '' }));
    expect(s2.reports.length).toBe(1);
  });

  it('차단한 그룹에는 참여 요청 불가, 중복 요청 방지', () => {
    let s = defaultState();
    const g05 = seed.groups.find((g) => g.id === 'g05')!;
    s = expectOk(requestJoin(s, g05, '안녕하세요'));
    expect(requestJoin(s, g05, '또').ok).toBe(false);
    s = addBlock(s, 'group', 'g05', g05.title);
    expect(addBlock(s, 'group', 'g05', g05.title).blocks.length).toBe(1);
    const s2 = { ...s, joinRequests: [] };
    expect(requestJoin(s2, g05, '안녕').ok).toBe(false);
  });
});

describe('그룹 만들기와 입력 처리', () => {
  const input: GroupInput = {
    category: 'exhibition',
    title: '<img src=x onerror="alert(1)"> 전시 같이',
    description: '<script>alert("x")</script> 천천히 보는 전시 모임이에요.',
    place: '종로',
    meetingPoint: '역 1번 출구 앞',
    date: addDays(TODAY, 3),
    startTime: '11:00',
    endTime: '13:00',
    capacity: 3,
    costTotal: 15000,
    included: '입장료',
    separate: '음료',
    prefs: [0, 50, 0, 50, 0],
    conditions: { viewPace: '천천히 오래', talk: '관람 후 이야기' },
    route: '로비 집합\n관람\n해산',
    extras: [{ label: '카페', required: false }],
    dismissPlan: '로비에서 해산',
    cancelPolicy: '전날까지',
  };

  it('필수 항목 검증', () => {
    const r = createGroup(defaultState(), { ...input, title: '', endTime: '10:00', conditions: {} }, TODAY);
    expect(r.ok).toBe(false);
    expect(r.errors?.title).toBeTruthy();
    expect(r.errors?.endTime).toBeTruthy();
    expect(r.errors?.['cond.viewPace']).toBeTruthy();
  });

  it('생성한 그룹은 둘러보기와 역매칭에 반영된다', () => {
    const r = createGroup(defaultState(), input, TODAY);
    const s = expectOk(r);
    const groups = allGroups(s, seed.groups);
    const g = groups.find((x) => x.id === r.group!.id)!;
    expect(g.hostId).toBe(ME);
    // 텍스트는 그대로 문자열로 저장된다 (렌더링 시 React가 이스케이프)
    expect(g.title).toContain('<img');
    expect(filterExplore(groups, { category: 'exhibition', date: 'all', budgetMax: null, onlyOpen: true }, [], TODAY).some((x) => x.id === g.id)).toBe(true);
    const { candidates } = findCandidates(g, seed.people, s, ME);
    expect(candidates.map((c) => c.person.id)).toContain('p06');
    expect(candidates.some((c) => c.person.id === 'p09')).toBe(false); // 동의 안 함
  });

  it('cleanText는 제어 문자를 제거하고 길이를 제한한다', () => {
    expect(cleanText('  a\u0000b  ', 10)).toBe('ab');
    expect(cleanText('abcdef', 3)).toBe('abc');
  });
});

describe('저장소 복원', () => {
  it('손상된 값은 기본값으로 복구', () => {
    expect(normalizeState(null)).toEqual(defaultState());
    expect(normalizeState({ version: 2 })).toEqual(defaultState());
    const s = normalizeState({ version: 1, savedGroupIds: 'oops', reverseOptIn: 'yes' });
    expect(s.savedGroupIds).toEqual([]);
    expect(s.reverseOptIn).toBe(false);
  });
});
