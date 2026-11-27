// 코치 소개·수업 배정·저장 데이터 연결 검증
import { describe, expect, it } from 'vitest';
import { COACH_PROFILES } from './coaches';
import { createSeed, STAFF } from './seed';
import { CAPACITY, sessionsOn } from '../domain/schedule';
import { addDays } from '../lib/time';
import { createLocalRepository, STORAGE_KEY } from '../adapters/storage';

const kind = (id: string) => STAFF.find((s) => s.id === id)?.kind;

describe('코치 소개 인물', () => {
  it('이현석·정연태·변지원·기윤재 순서이며 기존 직원 ID(매니저)와 연결된다', () => {
    expect(COACH_PROFILES.map((p) => STAFF.find((s) => s.id === p.staffId)?.name)).toEqual(['이현석', '정연태', '변지원', '기윤재']);
    expect(COACH_PROFILES.every((p) => kind(p.staffId) === 'manager')).toBe(true);
    // 같은 이름의 직원이 중복으로 존재하지 않는다
    expect(new Set(STAFF.map((s) => s.name)).size).toBe(STAFF.length);
  });
});

describe('수업 구성', () => {
  it('모든 수업: 정원 6명, 매니저 1명(교대 순환) + 서로 다른 코치 2명, 중복 배정 없음', () => {
    const managersSeen = new Set<string>();
    for (let d = 0; d < 400; d++) {
      for (const s of sessionsOn(addDays('2026-01-01', d))) {
        expect(s.capacity).toBe(CAPACITY);
        expect(CAPACITY).toBe(6);
        expect(kind(s.managerId)).toBe('manager');
        expect(s.coachIds.every((c) => kind(c) === 'coach')).toBe(true);
        expect(new Set([s.managerId, ...s.coachIds]).size).toBe(3);
        managersSeen.add(s.managerId);
      }
    }
    expect([...managersSeen].sort()).toEqual(['m1', 'm2', 'm3', 'm4']);
  });
});

describe('기존 브라우저 저장 데이터', () => {
  it('이전에 저장된 데이터를 초기화 없이 그대로 불러오고 직원 이름·기록이 유지된다', () => {
    const now = new Date('2026-11-25T07:30:00+09:00');
    const saved = createSeed(now);
    const mem = new Map([[STORAGE_KEY, JSON.stringify(saved)]]);
    const kv = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const { state, notice } = createLocalRepository(kv).load(now);
    expect(notice).toBeNull();
    expect(state.bookings).toEqual(saved.bookings);
    expect(state.measurements).toEqual(saved.measurements);
    expect(state.staff.map((s) => [s.id, s.name, s.kind])).toEqual(STAFF.map((s) => [s.id, s.name, s.kind]));
  });
});
