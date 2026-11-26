import type { AppNotification, AppState, NotificationType, Result } from '../domain/types';

export function uid(prefix: string): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function ok<T>(state: AppState, value: T, message?: string): Result<T> {
  return { ok: true, state, value, message };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** 제어 문자 제거 + 공백 정리 + 길이 제한 */
export function cleanText(input: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

export function notify(
  state: AppState,
  n: { memberId: string; type: NotificationType; title: string; body: string; link: string },
  now: Date,
): AppState {
  const item: AppNotification = { ...n, id: uid('nt'), createdAt: now.toISOString(), read: false };
  return { ...state, notifications: [item, ...state.notifications] };
}

export function isStaff(state: AppState, staffId: string, kind?: 'manager' | 'coach'): boolean {
  const s = state.staff.find((x) => x.id === staffId);
  return !!s && (!kind || s.kind === kind);
}
