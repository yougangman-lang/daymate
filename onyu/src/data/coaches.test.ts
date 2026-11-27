// 코치 소개·수업 배정·저장 데이터 연결 검증
import { describe, expect, it } from 'vitest';
import { COACH_PROFILES } from './coaches';
import { createSeed, STAFF } from './seed';
import { CAPACITY, sessionsOn } from '../domain/schedule';
import { addDays } from '../lib/time';
import { createLocalRepository, STORAGE_KEY } from '../adapters/storage';
import type { AppState } from '../domain/types';

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

describe('이전 알림 문구 변경', () => {
  const now = new Date('2026-11-25T07:30:00+09:00');
  const memKv = (init: string) => {
    const mem = new Map([[STORAGE_KEY, init]]);
    return { mem, kv: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } };
  };
  /** 이전 버전에서 저장된 상태: 매니저 문구 알림 2건(읽음 1건, 안 읽음 1건) */
  function oldSaved(): AppState {
    const s = createSeed(now);
    const notifications = s.notifications.map((n) => (n.id === 'nt-seed-3' ? { ...n, body: '쉬운 설명은 매니저가 확인한 뒤 알려드려요.' } : n));
    notifications.push({ ...notifications.find((n) => n.id === 'nt-seed-3')!, id: 'nt-old-2', body: '측정 기록은 바로 볼 수 있어요. 쉬운 설명은 매니저가 확인한 뒤 알려드려요.', read: true });
    return { ...s, notifications };
  }

  it('해당 알림 본문만 바꾸고 읽음 상태·다른 기록은 보존, 초기화 없음, 저장소에도 반영', () => {
    const before = oldSaved();
    const { mem, kv } = memKv(JSON.stringify(before));
    const { state, notice } = createLocalRepository(kv).load(now);
    expect(notice).toBeNull();
    const byId = (s: AppState, id: string) => s.notifications.find((n) => n.id === id)!;
    expect(byId(state, 'nt-seed-3').body).toBe('쉬운 설명은 온유 담당자가 확인한 뒤 알려드려요.');
    expect(byId(state, 'nt-old-2').body).toBe('측정 기록은 바로 볼 수 있어요. 쉬운 설명은 온유 담당자가 확인한 뒤 알려드려요.');
    expect(byId(state, 'nt-seed-3').read).toBe(false);
    expect(byId(state, 'nt-old-2').read).toBe(true);
    // 문구 외에는 그대로
    const strip = (s: AppState) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, body: '' })) });
    expect(strip(state)).toEqual(strip(before));
    for (const n of state.notifications.filter((n) => !['nt-seed-3', 'nt-old-2'].includes(n.id))) expect(n).toEqual(byId(before, n.id));
    expect(JSON.parse(mem.get(STORAGE_KEY)!)).toEqual(state);
  });

  it('이미 바뀐 데이터는 다시 저장하지 않는다', () => {
    const saved = JSON.stringify(createSeed(now));
    const { kv } = memKv(saved);
    let writes = 0;
    const counting = { ...kv, setItem: (k: string, v: string) => { writes++; kv.setItem(k, v); } };
    createLocalRepository(counting).load(now);
    expect(writes).toBe(0);
  });
});

