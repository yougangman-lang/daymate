import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSeed } from './data/seed';
import { allGroups, mePerson } from './lib/actions';
import { todayISO } from './lib/date';
import { clearState, defaultState, loadState, saveState } from './lib/storage';
import type { AppState, Group, Person } from './lib/types';
import { ME } from './lib/types';

interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

interface Store {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => void;
  today: string;
  groups: Group[];
  /** 예시 참여자 (허구) */
  people: Person[];
  /** 예시 참여자 + 내 프로필(테스트 완료 시) */
  everyone: Person[];
  personById: (id: string) => Person | undefined;
  storageOk: boolean;
  toast: (message: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [storageOk, setStorageOk] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const today = useMemo(() => todayISO(), []);
  const seed = useMemo(() => buildSeed(today), [today]);

  useEffect(() => {
    setStorageOk(saveState(state));
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);
  const reset = useCallback(() => {
    clearState();
    setState(defaultState());
  }, []);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<Store>(() => {
    const groups = allGroups(state, seed.groups);
    const me = mePerson(state);
    const everyone = me ? [...seed.people, me] : seed.people;
    const personById = (id: string) => {
      if (id === ME) return me ?? { ...meFallback(state) };
      return seed.people.find((p) => p.id === id);
    };
    return { state, update, reset, today, groups, people: seed.people, everyone, personById, storageOk, toast, toasts };
  }, [state, seed, update, reset, today, storageOk, toast, toasts]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function meFallback(state: AppState): Person {
  return {
    id: ME,
    nickname: state.profile.nickname || '나',
    ageRange: '비공개',
    schoolName: '비공개',
    verification: 'none',
    bio: '',
    interests: state.profile.interests,
    dates: state.profile.dates,
    timeSlots: state.profile.timeSlots,
    budgetMax: state.profile.budgetMax,
    conditions: state.profile.conditions,
    traits: [50, 50, 50, 50, 50],
    reverseOptIn: false,
    avatarHue: 250,
  };
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider missing');
  return ctx;
}
