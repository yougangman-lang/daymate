// 공통 데이터 저장 계층. 서비스 함수의 결과를 저장소에 먼저 저장하고, 저장에 성공한 경우에만 화면 상태를 바꾼다.
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { AppState, Result } from '../domain/types';
import { createLocalRepository, STORAGE_KEY, type LoadNotice, type StateRepository } from '../adapters/storage';
import { createSeed } from '../data/seed';

type Action<T> = (state: AppState, now: Date) => Result<T>;

export interface Store {
  get(): AppState;
  subscribe(fn: () => void): () => void;
  now(): Date;
  run<T>(action: Action<T>): Result<T>;
  reset(): Result;
  notice: LoadNotice;
  dismissNotice(): void;
}

export function createStore(repo: StateRepository = createLocalRepository()): Store {
  const loaded = repo.load(new Date());
  let state = loaded.state;
  let notice: LoadNotice = loaded.notice;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  const now = () => new Date(Date.now() + (state.demo.clockOffsetMs || 0));

  if (loaded.notice) repo.save(state); // 처음 상태 또는 복구된 상태를 저장

  const store: Store = {
    get: () => state,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    now,
    run(action) {
      const r = action(state, now());
      if (!r.ok) return r;
      const saved = repo.save(r.state);
      if (!saved.ok) return { ok: false, error: saved.error };
      state = r.state;
      emit();
      return r;
    },
    reset() {
      const seeded = createSeed(new Date());
      // 화면 위치(회원/운영진)는 유지하고 데이터만 발표 시작 상태로
      const fresh = { ...seeded, demo: { ...seeded.demo, view: state.demo.view, staffKind: state.demo.staffKind } };
      const saved = repo.save(fresh);
      if (!saved.ok) return { ok: false, error: saved.error };
      state = fresh;
      emit();
      return { ok: true, state, value: undefined, message: '시연 데이터를 발표 시작 상태로 되돌렸어요.' };
    },
    get notice() {
      return notice;
    },
    dismissNotice() {
      notice = null;
      emit();
    },
  };

  // 같은 브라우저의 다른 탭에서 바뀐 상태를 반영
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const next = repo.load(new Date());
      if (!next.notice) {
        state = next.state;
        emit();
      }
    });
  }
  return store;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** 시연 기준 시각. 30초마다 갱신한다. */
export function useNow(): Date {
  const store = useStore();
  const state = useAppState();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  void tick;
  void state.demo.clockOffsetMs;
  return store.now();
}
