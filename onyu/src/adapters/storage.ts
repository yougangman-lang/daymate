// 저장 어댑터. 시제품은 같은 브라우저의 localStorage만 사용한다 (기기 간 동기화 없음).
// 실제 운영에서는 이 인터페이스를 서버 API 저장소로 교체한다.
import type { AppState } from '../domain/types';
import { createSeed, STATE_VERSION } from '../data/seed';

export const STORAGE_KEY = 'onyu:demo:v1';
export const BACKUP_KEY = 'onyu:demo:corrupt-backup';

export type LoadNotice = 'fresh' | 'corrupt' | 'version' | null;
export interface StateRepository {
  load(now: Date): { state: AppState; notice: LoadNotice };
  save(state: AppState): { ok: true } | { ok: false; error: string };
  clear(): void;
}

const ARRAYS: (keyof AppState)[] = ['staff', 'members', 'bookings', 'waitlist', 'measurements', 'feedback', 'products', 'coupons', 'mallEvents', 'inquiries', 'notifications'];

export function isValidState(v: unknown): v is AppState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (s.version !== STATE_VERSION) return false;
  if (!s.demo || typeof s.demo !== 'object') return false;
  for (const k of ARRAYS) if (!Array.isArray(s[k])) return false;
  const members = s.members as { id?: unknown; memberships?: unknown; prefs?: unknown }[];
  if (members.length === 0 || members.some((m) => typeof m?.id !== 'string' || !Array.isArray(m.memberships) || !m.prefs)) return false;
  const demo = s.demo as { memberId?: unknown; clockOffsetMs?: unknown };
  if (typeof demo.memberId !== 'string' || !members.some((m) => m.id === demo.memberId)) return false;
  if (typeof demo.clockOffsetMs !== 'number') return false;
  return true;
}

const OLD_EXPLAIN_TEXT = '쉬운 설명은 매니저가 확인한 뒤';
const NEW_EXPLAIN_TEXT = '쉬운 설명은 온유 담당자가 확인한 뒤';

/**
 * 이전에 저장된 시연 알림 문구만 새 명칭으로 바꾼다.
 * 해당 문구가 든 알림의 본문만 고치고 읽음 상태·예약·출석·측정 기록은 그대로 둔다. 바꿀 것이 없으면 같은 객체를 돌려준다.
 */
export function migrateNotificationText(state: AppState): AppState {
  if (!state.notifications.some((n) => n.body.includes(OLD_EXPLAIN_TEXT))) return state;
  return {
    ...state,
    notifications: state.notifications.map((n) => (n.body.includes(OLD_EXPLAIN_TEXT) ? { ...n, body: n.body.replaceAll(OLD_EXPLAIN_TEXT, NEW_EXPLAIN_TEXT) } : n)),
  };
}

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function createLocalRepository(kv: KV | undefined = globalThis.localStorage): StateRepository {
  return {
    load(now) {
      let raw: string | null;
      try {
        raw = kv?.getItem(STORAGE_KEY) ?? null;
      } catch {
        raw = null;
      }
      if (raw === null) return { state: createSeed(now), notice: 'fresh' };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      if (isValidState(parsed)) {
        const state = migrateNotificationText(parsed);
        if (state !== parsed) {
          try {
            kv?.setItem(STORAGE_KEY, JSON.stringify(state));
          } catch {
            /* 저장 실패 시 다음 로드에서 다시 적용 */
          }
        }
        return { state, notice: null };
      }
      try {
        kv?.setItem(BACKUP_KEY, raw);
      } catch {
        /* 백업 실패는 무시 */
      }
      const isOldVersion = !!parsed && typeof parsed === 'object' && (parsed as { version?: unknown }).version !== STATE_VERSION;
      return { state: createSeed(now), notice: isOldVersion ? 'version' : 'corrupt' };
    },
    save(state) {
      try {
        if (!kv) return { ok: false, error: '이 브라우저에서는 저장 공간을 사용할 수 없어요.' };
        kv.setItem(STORAGE_KEY, JSON.stringify(state));
        return { ok: true };
      } catch {
        return { ok: false, error: '브라우저 저장 공간에 저장하지 못했어요. 변경 내용이 반영되지 않았어요.' };
      }
    },
    clear() {
      try {
        kv?.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    },
  };
}

export function memoryKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
