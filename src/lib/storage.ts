import type { AppState } from './types';

export const STORAGE_KEY = 'daymate:prototype:v1';

export function defaultState(): AppState {
  return {
    version: 1,
    profile: {
      nickname: '',
      ageRange: '',
      interests: [],
      dates: [],
      timeSlots: ['afternoon', 'evening'],
      budgetMax: 30000,
      conditions: {},
    },
    test: { draft: [null, null, null, null, null], result: null, completedAt: null },
    reverseOptIn: false,
    verification: { schoolId: null, status: 'none', completedAt: null },
    savedGroupIds: [],
    createdGroups: [],
    joinRequests: [],
    invitations: [],
    reports: [],
    blocks: [],
    acceptedMembers: {},
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 저장된 값이 손상됐거나 이전 버전이면 기본값과 병합한다. */
export function normalizeState(raw: unknown): AppState {
  const base = defaultState();
  if (!isObject(raw) || raw.version !== 1) return base;
  const r = raw as Partial<AppState>;
  const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  return {
    ...base,
    profile: isObject(r.profile) ? { ...base.profile, ...r.profile } : base.profile,
    test:
      isObject(r.test) && Array.isArray(r.test.draft) && r.test.draft.length === 5
        ? { ...base.test, ...r.test }
        : base.test,
    reverseOptIn: r.reverseOptIn === true,
    verification: isObject(r.verification) ? { ...base.verification, ...r.verification } : base.verification,
    savedGroupIds: arr(r.savedGroupIds, []),
    createdGroups: arr(r.createdGroups, []),
    joinRequests: arr(r.joinRequests, []),
    invitations: arr(r.invitations, []),
    reports: arr(r.reports, []),
    blocks: arr(r.blocks, []),
    acceptedMembers: isObject(r.acceptedMembers) ? (r.acceptedMembers as AppState['acceptedMembers']) : {},
  };
}

export function loadState(): AppState {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? normalizeState(JSON.parse(text)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장소를 사용할 수 없는 환경 */
  }
}
