import type { TimeSlot } from './types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function nextDays(fromISO: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(fromISO, i));
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISODate(parseISODate(iso)) === iso;
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES[d.getDay()]})`;
}

export function formatShortDate(iso: string): { day: string; date: string; weekday: string } {
  const d = parseISODate(iso);
  return { day: String(d.getDate()), date: `${d.getMonth() + 1}/${d.getDate()}`, weekday: DAY_NAMES[d.getDay()] };
}

export function timeSlotOf(time: string): TimeSlot {
  const hour = Number(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};

export const TIME_SLOT_RANGE: Record<TimeSlot, string> = {
  morning: '~12시',
  afternoon: '12~17시',
  evening: '17시~',
};

export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}
